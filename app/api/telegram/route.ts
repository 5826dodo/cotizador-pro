import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const chatId = body.message?.chat?.id?.toString();
    const text = body.message?.text || '';

    if (chatId !== process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID)
      return NextResponse.json({ ok: true });

    const apiKey = 'AIzaSyAY3_HRuhvrwwDZTXBDGBjTofAKsiBU3jQ';

    // 1. RECOLECTAR CONTEXTO (Ajustado a tu estructura de tabla)
    // Usamos la fecha de ayer y hoy para asegurar que capturemos el rango correcto
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyISO = hoy.toISOString();

    const [ventasRes, ultimaTasaRes, stockRes] = await Promise.all([
      // Buscamos ventas aprobadas desde el inicio de hoy
      supabase
        .from('cotizaciones')
        .select('total, moneda, tasa_bcv')
        .eq('estado', 'aprobado')
        .gte('created_at', hoyISO),

      // Buscamos la tasa de la última cotización aprobada de cualquier fecha
      supabase
        .from('cotizaciones')
        .select('tasa_bcv')
        .eq('estado', 'aprobado')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Stock bajo
      supabase
        .from('productos')
        .select('nombre, stock')
        .lt('stock', 10)
        .limit(8),
    ]);

    // 2. PROCESAR TOTALES (Convertimos a número por si acaso vienen como string)
    const ventas = ventasRes.data || [];
    let totalBs = 0;
    let totalUsd = 0;

    ventas.forEach((v) => {
      const monto = parseFloat(v.total) || 0;
      if (v.moneda === 'BS') {
        totalBs += monto;
      } else if (v.moneda === 'USD') {
        totalUsd += monto;
      }
    });

    const tasaActual = ultimaTasaRes.data?.tasa_bcv || 'No registrada';
    const productosBajos =
      stockRes.data?.map((p) => `${p.nombre} (${p.stock})`).join(', ') ||
      'Todo al día';

    // 3. PROMPT DE LENGUAJE NATURAL
    const promptContexto = `Eres el asistente inteligente de la ferretería "FERREMATERIALES LER C.A.". 
    Tu tono es servicial, profesional y muy claro.

    CONTEXTO DEL SISTEMA:
    - Tasa de cambio actual: ${tasaActual} Bs/$.
    - Ventas de hoy: ${ventas.length} pedidos aprobados.
    - Acumulado hoy: Bs. ${totalBs.toLocaleString('es-VE')} y $${totalUsd.toLocaleString('en-US')}.
    - Alerta de Inventario (Stock bajo): ${productosBajos}.

    MENSAJE DEL JEFE: "${text}"

    INSTRUCCIONES:
    - Responde de forma fluida y natural.
    - Si el jefe saluda, responde amablemente y dale un resumen rápido de la tasa o ventas.
    - Si pregunta por ventas, dale los totales en Bs y $.
    - Si pregunta por la tasa, menciónala según la última venta.
    - Usa emojis de ferretería y finanzas.`;

    // 4. LLAMADA A GEMINI 1.5 FLASH
    let respuestaFinal = '';
    try {
      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptContexto }] }],
          }),
        },
      );

      const data = await aiResponse.json();
      respuestaFinal = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!respuestaFinal) throw new Error('Sin respuesta de IA');
    } catch (e) {
      // Fallback amigable si la IA falla
      respuestaFinal = `👋 ¡Hola Jefe! Hubo un detalle con la IA, pero aquí le tengo los datos:
      
💰 *Ventas hoy:* Bs. ${totalBs.toLocaleString('es-VE')} / $${totalUsd.toLocaleString()}
📈 *Tasa:* ${tasaActual} Bs/$
⚠️ *Stock bajo:* ${productosBajos}`;
    }

    // 5. ENVIAR A TELEGRAM
    await fetch(
      `https://api.telegram.org/bot${process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: respuestaFinal,
          parse_mode: 'Markdown',
        }),
      },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ ok: true });
  }
}
