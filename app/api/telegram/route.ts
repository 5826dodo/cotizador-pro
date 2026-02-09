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

    // 1. DETERMINAR QUÉ BUSCAR (Lógica previa)
    const mensajeMinuscula = text.toLowerCase();

    // Rango de fechas para Venezuela (Hoy)
    const hoy = new Date();
    const inicioHoy = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate(),
    ).toISOString();

    // 2. BUSCAR DATOS EN SUPABASE (Multitarea)
    const [ventasRes, ultimaTasaRes, stockRes, productoEspecifico] =
      await Promise.all([
        // Ventas de hoy
        supabase
          .from('cotizaciones')
          .select('total, moneda, tasa_bcv')
          .eq('estado', 'aprobado')
          .gte('created_at', inicioHoy),
        // Tasa actual
        supabase
          .from('cotizaciones')
          .select('tasa_bcv')
          .eq('estado', 'aprobado')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        // Stock crítico
        supabase
          .from('productos')
          .select('nombre, stock')
          .lt('stock', 10)
          .limit(5),
        // Búsqueda de producto (Si el jefe pregunta por algo específico)
        mensajeMinuscula.length > 3
          ? supabase
              .from('productos')
              .select('nombre, precio, stock')
              .ilike('nombre', `%${text.split(' ').pop()}%`)
              .limit(3)
          : { data: null },
      ]);

    // 3. PROCESAR RESULTADOS
    const ventas = ventasRes.data || [];
    let totalBs = 0;
    let totalUsd = 0;
    ventas.forEach((v) => {
      const monto = parseFloat(v.total) || 0;
      if (v.moneda === 'BS') totalBs += monto;
      else if (v.moneda === 'USD') totalUsd += monto;
    });

    const tasaActual = ultimaTasaRes.data?.tasa_bcv || '36.50';
    const listaStockBajo =
      stockRes.data?.map((p) => `${p.nombre}(${p.stock})`).join(', ') ||
      'Todo bien';
    const datosProducto = productoEspecifico.data
      ? JSON.stringify(productoEspecifico.data)
      : 'No se buscó producto específico';

    // 4. CONSTRUIR EL PROMPT PARA LENGUAJE NATURAL
    const promptContexto = `
      Eres el encargado de FERREMATERIALES LER C.A. Hablas de forma natural, fluida y con emojis.
      
      DATOS REALES DEL SISTEMA:
      - Tasa actual: ${tasaActual} Bs/$.
      - Ventas de hoy: ${ventas.length} aprobadas (Total: Bs. ${totalBs} / $${totalUsd}).
      - Productos con poco stock: ${listaStockBajo}.
      - Información de inventario encontrada: ${datosProducto}.

      EL JEFE DICE: "${text}"

      TAREA: 
      Responde al jefe de forma conversacional. 
      - Si pregunta por un precio o producto, usa la "Información de inventario encontrada".
      - Si pregunta por ventas, dale el resumen de hoy.
      - Si no hay datos de lo que pide, dile amablemente que no encontraste ese producto exacto.
    `;

    // 5. LLAMADA A LA IA
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptContexto }] }],
          generationConfig: { temperature: 0.8 }, // Más alto para que sea más natural
        }),
      },
    );

    const data = await aiResponse.json();
    const respuestaFinal =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Jefe, estoy teniendo un problema para procesar el mensaje. ¿Podría repetirlo?';

    // 6. ENVIAR A TELEGRAM
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
