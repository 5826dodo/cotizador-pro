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

    // 1. AJUSTE DE FECHA (ZONA HORARIA VENEZUELA)
    const ahora = new Date();
    const inicioDiaVzla = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
    );
    const inicioDiaIso = inicioDiaVzla.toISOString();

    // 2. CONSULTAS A SUPABASE
    const [ventasRes, ultimaTasaRes, stockRes, busquedaProdRes] =
      await Promise.all([
        supabase
          .from('cotizaciones')
          .select('total, moneda, tasa_bcv, fecha_aprobacion')
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
          .limit(2),
      ]);

    // 3. PROCESAR RESULTADOS
    const ventas = ventasRes.data || [];
    let totalBs = 0,
      totalUsd = 0;

    ventas.forEach((v) => {
      const montoD = parseFloat(v.total) || 0;
      const tasaV = parseFloat(v.tasa_bcv) || 1;
      if (v.moneda === 'BS') {
        totalBs += montoD * tasaV;
      } else {
        totalUsd += montoD;
      }
    });

    const tasaActual = ultimaTasaRes.data?.tasa_bcv || '382.63';
    const prodsBajos =
      stockRes.data?.map((p) => `${p.nombre} (${p.stock})`).join(', ') ||
      'Todo en orden';
    const prodInfo =
      busquedaProdRes.data && busquedaProdRes.data.length > 0
        ? JSON.stringify(busquedaProdRes.data)
        : 'No hay info específica';

    // 4. LLAMADA A GEMINI CON MANEJO DE ERRORES MEJORADO
    let respuestaFinal = '';

    const promptIA = `Eres el asistente de FERREMATERIALES LER C.A.
    Tasa: ${tasaActual} Bs/$. 
    Ventas Hoy: ${ventas.length} ventas ($${totalUsd} y Bs.${totalBs.toLocaleString('es-VE')}). 
    Stock Bajo: ${prodsBajos}. 
    Busqueda Producto: ${prodInfo}.
    Pregunta: "${text}".
    Responde natural y breve con emojis.`;

    try {
      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptIA }] }],
          }),
        },
      );

      const aiData = await aiResponse.json();

      if (
        aiData.candidates &&
        aiData.candidates[0]?.content?.parts?.[0]?.text
      ) {
        respuestaFinal = aiData.candidates[0].content.parts[0].text;
      } else {
        // Si la IA responde pero no trae texto (ej. por seguridad o bloqueo)
        throw new Error('IA sin contenido');
      }
    } catch (e) {
      // ESTE ES EL FAILSAFE: Si la IA falla, construimos el mensaje manualmente
      respuestaFinal =
        `👋 *REPORTE DE HOY*\n\n` +
        `📈 *Tasa:* ${tasaActual} Bs/$\n` +
        `💰 *Ventas:* $${totalUsd.toLocaleString()} / Bs. ${totalBs.toLocaleString('es-VE')}\n` +
        `📦 *Ventas realizadas:* ${ventas.length}\n` +
        `⚠️ *Stock bajo:* ${prodsBajos}\n\n` +
        `_Nota: La IA no está disponible, pero aquí están tus datos reales._`;
    }

    // 5. ENVIAR A TELEGRAM
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
  } catch (error) {
    return NextResponse.json({ ok: true });
  }
}
