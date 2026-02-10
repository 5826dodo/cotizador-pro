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
    // Usamos el inicio del día pero restando unas horas para compensar el UTC de Supabase
    const ahora = new Date();
    const inicioDiaVzla = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
    );
    // Ajuste opcional: si son pasadas las 12am UTC pero en Vzla es ayer, esto lo captura
    const inicioDiaIso = inicioDiaVzla.toISOString();

    // 2. CONSULTAS A SUPABASE
    const [ventasRes, ultimaTasaRes, stockRes, busquedaProdRes] =
      await Promise.all([
        supabase
          .from('cotizaciones')
          .select('total, moneda, tasa_bcv, fecha_aprobacion')
          .eq('estado', 'aprobado')
          .gte('fecha_aprobacion', inicioDiaIso), // Cambiado a fecha_aprobacion
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

    // 3. PROCESAR RESULTADOS CON CÁLCULO DE DIVISA
    const ventas = ventasRes.data || [];
    let totalBs = 0,
      totalUsd = 0;

    ventas.forEach((v) => {
      const montoReferencialDolar = parseFloat(v.total) || 0;
      const tasaDeEsaVenta = parseFloat(v.tasa_bcv) || 1;

      if (v.moneda === 'BS') {
        // IMPORTANTE: Si la moneda es BS, multiplicamos el total($) por la tasa
        totalBs += montoReferencialDolar * tasaDeEsaVenta;
      } else {
        // Si es USD, sumamos directo a los dólares
        totalUsd += montoReferencialDolar;
      }
    });

    const tasaActual = ultimaTasaRes.data?.tasa_bcv || '382.63';

    const prodsBajos =
      stockRes.data && stockRes.data.length > 0
        ? stockRes.data.map((p) => `${p.nombre} (${p.stock})`).join(', ')
        : 'Todo en orden';

    const prodInfo =
      busquedaProdRes.data && busquedaProdRes.data.length > 0
        ? JSON.stringify(busquedaProdRes.data)
        : 'No encontrado en inventario';

    // 4. LLAMADA MEJORADA A GEMINI
    let respuestaFinal = '';
    try {
      const promptIA = `Eres el asistente inteligente de FERREMATERIALES LER C.A. 
      Contexto: Informa al jefe sobre el negocio.
      
      DATOS REALES:
      - Tasa actual: ${tasaActual} Bs/$.
      - Ventas de hoy: ${ventas.length} aprobadas.
      - Total en Bolívares: Bs. ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}.
      - Total en Dólares: $${totalUsd.toLocaleString()}.
      - Stock Crítico: ${prodsBajos}.
      - Inventario específico: ${prodInfo}.
      
      JEFE DICE: "${text}"
      
      INSTRUCCIÓN: Responde natural y profesional con emojis. Si hay ventas en BS, menciónalas con su monto en bolívares.`;

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptIA }] }],
          }),
        },
      );

      const aiData = await aiResponse.json();
      respuestaFinal =
        aiData.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Jefe, no pude procesar la respuesta de la IA.';
    } catch (e) {
      respuestaFinal = `👋 ¡Hola Jefe! Aquí tiene el reporte:\n\n📈 *Tasa:* ${tasaActual} Bs/$\n💰 *Ventas hoy:* $${totalUsd} / Bs. ${totalBs.toLocaleString('es-VE')}\n📦 *Stock Bajo:* ${prodsBajos}`;
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
  } catch (error: any) {
    console.error('Error en el webhook:', error);
    return NextResponse.json({ ok: true });
  }
}
