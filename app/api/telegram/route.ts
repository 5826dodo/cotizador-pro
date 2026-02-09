import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const chatId = body.message?.chat?.id?.toString();
    const text = body.message?.text || '';

    // 1. SEGURIDAD
    if (chatId !== process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID) {
      return NextResponse.json({ ok: true });
    }

    const apiKey = 'AIzaSyAY3_HRuhvrwwDZTXBDGBjTofAKsiBU3jQ';

    // 2. RECOLECTAR CONTEXTO (Ventas, Tasa, Stock)
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    const finHoy = new Date();
    finHoy.setHours(23, 59, 59, 999);

    const [tasaRes, ventasRes, stockRes] = await Promise.all([
      supabase
        .from('configuracion')
        .select('valor')
        .eq('clave', 'tasa_bcv')
        .maybeSingle(),
      supabase
        .from('cotizaciones')
        .select('total, moneda, tasa_bcv')
        .eq('estado', 'aprobado')
        .gte('created_at', inicioHoy.toISOString())
        .lte('created_at', finHoy.toISOString()),
      supabase
        .from('productos')
        .select('nombre, stock')
        .lt('stock', 10)
        .limit(8),
    ]);

    // Procesar totales
    const ventas = ventasRes.data || [];
    const totalBs = ventas
      .filter((v) => v.moneda === 'BS')
      .reduce((acc, curr) => acc + curr.total * (curr.tasa_bcv || 1), 0);
    const totalUsd = ventas
      .filter((v) => v.moneda === 'USD')
      .reduce((acc, curr) => acc + curr.total, 0);
    const productosBajos =
      stockRes.data?.map((p) => `${p.nombre} (${p.stock})`).join(', ') ||
      'Ninguno';

    // 3. PROMPT PARA LENGUAJE NATURAL
    const promptContexto = `
      Eres el asistente inteligente de "FERREMATERIALES LER C.A.". Hablas de forma ejecutiva, amable y eficiente.
      
      DATOS REALES DEL SISTEMA AHORA:
      - Tasa BCV: ${tasaRes.data?.valor || '45.50'} Bs/$.
      - Ventas Hoy: ${ventas.length} ventas aprobadas.
      - Totales: Bs. ${totalBs.toLocaleString('es-VE')} y $${totalUsd.toLocaleString()}.
      - Stock Bajo: ${productosBajos}.
      
      MENSAJE DEL JEFE: "${text}"
      
      INSTRUCCIONES: 
      1. Responde al mensaje del jefe usando los datos anteriores. 
      2. Si pregunta por algo que no está en los datos (como el precio de un tornillo), dile que para precios específicos debe darte el nombre exacto del producto.
      3. Usa emojis para que sea fácil de leer en Telegram.
    `;

    // 4. PETICIÓN A GEMINI 1.5 PRO
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptContexto }] }],
          generationConfig: { temperature: 0.7 },
        }),
      },
    );

    const data = await aiResponse.json();
    let respuestaFinal = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!respuestaFinal) {
      respuestaFinal = `Jefe, tuve un problema con la IA, pero aquí tiene los datos crudos:\n💰 Ventas: $${totalUsd}\n🇻🇪 Tasa: ${tasaRes.data?.valor}\n📦 Stock bajo: ${productosBajos}`;
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
    console.error('Error Webhook:', error);
    return NextResponse.json({ ok: true });
  }
}
