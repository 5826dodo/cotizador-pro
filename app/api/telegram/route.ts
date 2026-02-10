import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
  let chatId = '';

  try {
    const body = await req.json();
    chatId = body.message?.chat?.id?.toString();
    const text = (body.message?.text || '').toLowerCase();

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
    const sBajo = stockRes.data?.length
      ? stockRes.data.map((p) => `• ${p.nombre} (${p.stock})`).join('\n')
      : '✅ Todo en orden';
    const pInfo = busquedaProdRes.data?.length
      ? busquedaProdRes.data
          .map(
            (p) =>
              `📦 *${p.nombre.toUpperCase()}*\n💰 Precio: $${p.precio}\n📉 Stock: ${p.stock}`,
          )
          .join('\n\n')
      : 'No encontré ese producto en el inventario.';

    // 4. LÓGICA DE RESPUESTA (Asistente Local)
    let respuestaFinal = '';

    if (
      text.includes('precio') ||
      text.includes('cuanto') ||
      text.includes('stock')
    ) {
      respuestaFinal = `🔍 *RESULTADO DE BÚSQUEDA:*\n\n${pInfo}\n\n📈 *Tasa actual:* ${tasaA} Bs/$`;
    } else if (
      text.includes('venta') ||
      text.includes('hoy') ||
      text.includes('reporte')
    ) {
      respuestaFinal =
        `📊 *REPORTE DE VENTAS HOY*\n\n` +
        `✅ *Ventas aprobadas:* ${ventas.length}\n` +
        `💵 *Total Dólares:* $${totalUsd.toLocaleString()}\n` +
        `🇻🇪 *Total Bolívares:* Bs. ${totalBs.toLocaleString('es-VE')}\n\n` +
        `📈 *Tasa BCV:* ${tasaA} Bs/$\n\n` +
        `📦 *Stock Crítico:* \n${sBajo}`;
    } else {
      respuestaFinal = `👋 ¡Hola Jefe! ¿En qué puedo ayudarle?\n\nPuede preguntarme por:\n• *Ventas de hoy*\n• *Precio de un producto*\n• *Reporte general*`;
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
