import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const apiKey = 'AIzaSyAY3_HRuhvrwwDZTXBDGBjTofAKsiBU3jQ';
  const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
  let chatId = '';

  try {
    const body = await req.json();
    chatId = body.message?.chat?.id?.toString();
    const text = body.message?.text || '';

    if (chatId !== process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID)
      return NextResponse.json({ ok: true });

    // 1. FECHA PARA VENEZUELA (Ajuste manual de zona horaria)
    const fechaHoy = new Date();
    fechaHoy.setHours(fechaHoy.getHours() - 4); // Ajuste simple a UTC-4
    const hoyISO = fechaHoy.toISOString().split('T')[0];

    // 2. BUSCAR DATOS (Con logs para ver qué falla)
    const [ventasRes, ultimaTasaRes, stockRes, busquedaProdRes] =
      await Promise.all([
        supabase
          .from('cotizaciones')
          .select('total, moneda, tasa_bcv')
          .eq('estado', 'aprobado')
          .gte('created_at', hoyISO),
        supabase
          .from('cotizaciones')
          .select('tasa_bcv')
          .eq('estado', 'aprobado')
          .order('created_at', { ascending: false })
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
          .limit(2),
      ]);

    // Procesar Ventas
    const ventas = ventasRes.data || [];
    let totalBs = 0,
      totalUsd = 0;
    ventas.forEach((v) => {
      const t = parseFloat(v.total) || 0;
      if (v.moneda === 'BS') totalBs += t;
      else totalUsd += t;
    });

    const tasa = ultimaTasaRes.data?.tasa_bcv || 'No definida';
    const prodsBajos =
      stockRes.data?.map((p) => `${p.nombre}(${p.stock})`).join(', ') ||
      'Todo bien';
    const prodEncontrado =
      busquedaProdRes.data && busquedaProdRes.data.length > 0
        ? JSON.stringify(busquedaProdRes.data)
        : 'No encontré ese producto específico';

    // 3. CONSTRUIR RESPUESTA CON IA
    const prompt = `Eres el asistente de FERREMATERIALES LER C.A.
    DATOS: Tasa ${tasa} Bs/$. Ventas Hoy: $${totalUsd} y Bs.${totalBs} (${ventas.length} ventas). 
    Stock Bajo: ${prodsBajos}. 
    Info Producto solicitado: ${prodEncontrado}.
    JEFE DICE: "${text}".
    RESPONDE: De forma natural, breve y profesional con emojis.`;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );

    const aiData = await aiResponse.json();
    const respuestaFinal =
      aiData.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Jefe, la IA no respondió, pero aquí tiene los datos:\n\n💰 Ventas: $' +
        totalUsd +
        '\n📈 Tasa: ' +
        tasa;

    // 4. ENVÍO FINAL
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
  } catch (error: any) {
    // SI ALGO FALLA, EL BOT TE DIRÁ QUÉ FUE DIRECTAMENTE
    if (chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `❌ ERROR CRÍTICO: ${error.message}`,
        }),
      });
    }
    return NextResponse.json({ ok: true });
  }
}
