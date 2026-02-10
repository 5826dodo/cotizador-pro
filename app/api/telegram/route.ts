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

    // 1. AJUSTE DE FECHA (ZONA HORARIA VENEZUELA UTC-4)
    // Creamos el inicio del día en hora local para que la comparativa sea justa
    const ahora = new Date();
    const inicioDia = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
    ).toISOString();

    // 2. CONSULTAS A SUPABASE
    // NOTA: He cambiado 'created_at' por 'fecha_aprobacion' en el filtro de ventas.
    // Si aún no has creado la columna, cámbiala de vuelta a 'created_at' temporalmente.
    const [ventasRes, ultimaTasaRes, stockRes, busquedaProdRes] =
      await Promise.all([
        supabase
          .from('cotizaciones')
          .select('total, moneda, tasa_bcv, created_at') // Podrías añadir fecha_aprobacion aquí
          .eq('estado', 'aprobado')
          .gte('created_at', inicioDia), // CAMBIAR A 'fecha_aprobacion' cuando crees la columna
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

    // 3. PROCESAR RESULTADOS
    const ventas = ventasRes.data || [];
    let totalBs = 0,
      totalUsd = 0;

    ventas.forEach((v) => {
      const monto = parseFloat(v.total) || 0;
      if (v.moneda === 'BS') {
        totalBs += monto;
      } else {
        totalUsd += monto;
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
      Contexto: Eres un empleado de confianza que informa al jefe sobre el estado del negocio.
      
      DATOS ACTUALES:
      - Tasa: ${tasaActual} Bs/$.
      - Ventas Hoy: ${ventas.length} aprobadas (Total: $${totalUsd} / Bs.${totalBs}).
      - Stock Bajo: ${prodsBajos}.
      - Info específica de producto: ${prodInfo}.
      
      JEFE DICE: "${text}"
      
      INSTRUCCIÓN: Responde de forma natural, breve y profesional. Si el jefe pregunta por un producto que no está en la info específica, dile que sea más detallado. Usa emojis.`;

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

      if (
        aiData.candidates &&
        aiData.candidates[0]?.content?.parts?.[0]?.text
      ) {
        respuestaFinal = aiData.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Sin respuesta de IA');
      }
    } catch (e) {
      respuestaFinal = `👋 ¡Hola Jefe! Aquí tiene el reporte:\n\n📈 *Tasa:* ${tasaActual} Bs/$\n💰 *Ventas hoy:* $${totalUsd} / Bs. ${totalBs}\n📦 *Stock Bajo:* ${prodsBajos}`;
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
