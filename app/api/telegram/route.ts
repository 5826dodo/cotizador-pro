import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  // Asegúrate de que esta clave no tenga restricciones de IP en Google Cloud Console
  const apiKey = 'AIzaSyAY3_HRuhvrwwDZTXBDGBjTofAKsiBU3jQ';
  const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
  let chatId = '';

  try {
    const body = await req.json();
    chatId = body.message?.chat?.id?.toString();
    const text = body.message?.text || '';

    if (chatId !== process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID)
      return NextResponse.json({ ok: true });

    // 1. FECHA (Hoy inicio)
    const inicioDiaIso = new Date(
      new Date().setHours(0, 0, 0, 0),
    ).toISOString();

    // 2. CONSULTAS SUPABASE
    const [ventasRes, ultimaTasaRes, stockRes, busquedaProdRes] =
      await Promise.all([
        supabase
          .from('cotizaciones')
          .select('total, moneda, tasa_bcv')
          .eq('estado', 'aprobado')
          .gte('fecha_aprobacion', inicioDiaIso),
        supabase
          .from('cotizaciones')
          .select('tasa_bcv')
          .eq('estado', 'aprobado')
          .order('fecha_aprobacion', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('productos')
          .select('nombre, stock')
          .lt('stock', 20)
          .limit(5),
        supabase
          .from('productos')
          .select('nombre, precio, stock')
          .ilike('nombre', `%${text.split(' ').pop()}%`)
          .limit(3),
      ]);

    // 3. PROCESAR DATA
    const ventas = ventasRes.data || [];
    let totalBs = 0,
      totalUsd = 0;
    ventas.forEach((v) => {
      const monto = parseFloat(v.total) || 0;
      const t = parseFloat(v.tasa_bcv) || 1;
      v.moneda === 'BS' ? (totalBs += monto * t) : (totalUsd += monto);
    });

    const tasaA = ultimaTasaRes.data?.tasa_bcv || '382.63';
    const sBajo =
      stockRes.data?.map((p) => `${p.nombre}(${p.stock})`).join(', ') || 'OK';

    // Formateamos la info del producto buscado para que la IA la entienda fácil
    const pInfo = busquedaProdRes.data?.length
      ? busquedaProdRes.data.map((p) => `${p.nombre}: $${p.precio}`).join(' | ')
      : 'No encontrado';

    // 4. LLAMADA A GEMINI (DIAGNÓSTICO DIRECTO)
    let respuestaFinal = '';
    try {
      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: `Hola, responde 'IA activa' si me lees.` }] },
            ],
          }),
        },
      );

      const aiData = await aiResponse.json();

      // Si Google responde con éxito
      if (aiData.candidates?.[0]?.content?.parts?.[0]?.text) {
        // Si llegamos aquí, la IA funciona. Entonces armamos la respuesta real.
        respuestaFinal = aiData.candidates[0].content.parts[0].text;
      } else {
        // ESTO NOS DIRÁ EL ERROR REAL EN TELEGRAM
        const errorDetalle = aiData.error?.message || JSON.stringify(aiData);
        respuestaFinal = `⚠️ *ERROR DE GOOGLE:* ${errorDetalle}`;
      }
    } catch (e: any) {
      respuestaFinal = `📡 *ERROR DE RED:* ${e.message}`;
    }

    // 5. TELEGRAM
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: respuestaFinal,
        parse_mode: 'Markdown',
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: true });
  }
}
