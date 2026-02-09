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

    // 1. OBTENER TASA BCV
    const { data: tasaData } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'tasa_bcv')
      .maybeSingle();
    const tasaActual = tasaData?.valor || 'no definida';

    const promptGlobal = `Eres el asistente de "FERREMATERIALES LER C.A.".
      Tasa BCV hoy: ${tasaActual}.
      Mensaje del jefe: "${text}"
      Responde SOLAMENTE con una etiqueta:
      [PRECIO:producto], [STOCK_INDIVIDUAL:producto], [INVENTARIO_GENERAL], [VENTAS_HOY], [TASA], [SALUDO]`;

    // 2. LLAMADA A LA IA CON SEGURIDAD
    let decision = '[SALUDO]';
    try {
      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptGlobal }] }],
          }),
        },
      );

      const data = await aiResponse.json();

      if (
        data &&
        data.candidates &&
        data.candidates[0]?.content?.parts?.[0]?.text
      ) {
        decision = data.candidates[0].content.parts[0].text.trim();
      } else {
        // Fallback manual si la IA no responde correctamente
        const lowText = text.toLowerCase();
        if (lowText.includes('cierre') || lowText.includes('venta'))
          decision = '[VENTAS_HOY]';
        else if (
          lowText.includes('stock') ||
          lowText.includes('inventario') ||
          lowText.includes('falta')
        )
          decision = '[INVENTARIO_GENERAL]';
        else if (lowText.includes('tasa') || lowText.includes('dolar'))
          decision = '[TASA]';
      }
    } catch (e) {
      console.error('Error en fetch de IA:', e);
    }

    // 3. EJECUCIÓN DE LÓGICA
    if (
      decision.includes('[PRECIO:') ||
      decision.includes('[STOCK_INDIVIDUAL:')
    ) {
      const producto = decision.split(':')[1]?.replace(']', '') || text;
      await buscarPrecio(chatId, producto, apiKey);
    } else if (decision.includes('[VENTAS_HOY]')) {
      await enviarCierreCaja(chatId);
    } else if (decision.includes('[INVENTARIO_GENERAL]')) {
      await enviarReporteStock(chatId);
    } else if (decision.includes('[TASA]')) {
      await enviarMensaje(
        chatId,
        `📢 Jefe, la tasa configurada hoy es de **${tasaActual} Bs/$**.`,
      );
    } else {
      await enviarMensaje(
        chatId,
        '👋 ¡Hola Jefe! Estoy listo. Puedo darle precios, stock, ventas del día o la tasa BCV. ¿Qué desea consultar?',
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error General:', error);
    return NextResponse.json({ ok: true });
  }
}

// --- FUNCIONES AUXILIARES ---

async function buscarPrecio(
  chatId: string,
  nombreBusqueda: string,
  apiKey: string,
) {
  const { data: prods } = await supabase
    .from('productos')
    .select('nombre, precio_usd, stock')
    .ilike('nombre', `%${nombreBusqueda.trim()}%`)
    .limit(3);

  if (!prods || prods.length === 0) {
    return enviarMensaje(
      chatId,
      `No encontré productos relacionados con "${nombreBusqueda}".`,
    );
  }

  try {
    const promptRedaccion = `El jefe de la ferretería preguntó por "${nombreBusqueda}". Encontré esto: ${JSON.stringify(prods)}. Responde breve con precios y stock.`;
    const resIA = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptRedaccion }] }],
        }),
      },
    );
    const dataIA = await resIA.json();
    const textoFinal =
      dataIA.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Aquí tiene los datos, jefe.';
    await enviarMensaje(chatId, textoFinal);
  } catch (e) {
    // Si la redacción de la IA falla, enviamos los datos crudos
    const lista = prods
      .map((p) => `🔹 ${p.nombre}: $${p.precio_usd} (Stock: ${p.stock})`)
      .join('\n');
    await enviarMensaje(chatId, `Jefe, esto fue lo que encontré:\n\n${lista}`);
  }
}

// --- FUNCIÓN DE CIERRE CORREGIDA (Rango de 24h) ---
async function enviarCierreCaja(chatId: string) {
  // Creamos el rango de hoy en Venezuela (VET es UTC-4)
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  const finHoy = new Date();
  finHoy.setHours(23, 59, 59, 999);

  const { data: cots, error } = await supabase
    .from('cotizaciones')
    .select('*')
    .eq('estado', 'aprobado')
    .gte('created_at', inicioHoy.toISOString())
    .lte('created_at', finHoy.toISOString());

  if (error) {
    return enviarMensaje(chatId, `❌ Error en DB: ${error.message}`);
  }

  if (!cots || cots.length === 0) {
    return enviarMensaje(
      chatId,
      '📭 Jefe, no encontré ventas aprobadas para la fecha de hoy en el sistema.',
    );
  }

  const totalBs = cots
    .filter((c) => c.moneda === 'BS')
    .reduce((acc, curr) => acc + curr.total * (curr.tasa_bcv || 1), 0);
  const totalUsd = cots
    .filter((c) => c.moneda === 'USD')
    .reduce((acc, curr) => acc + curr.total, 0);

  const mensaje =
    `💰 *CIERRE DE CAJA*\n` +
    `--------------------------\n` +
    `🇻🇪 *Bs:* ${totalBs.toLocaleString('es-VE')}\n` +
    `💵 *USD:* $${totalUsd.toLocaleString()}\n` +
    `📈 *Ventas:* ${cots.length}\n` +
    `📅 *Desde:* ${inicioHoy.toLocaleTimeString()}\n` +
    `--------------------------`;

  await enviarMensaje(chatId, mensaje);
}

// --- FUNCIÓN DE TASA (Con más seguridad) ---
async function obtenerTasaActual() {
  try {
    const { data } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'tasa_bcv')
      .single();
    return data?.valor || '75.00'; // Valor por defecto si falla
  } catch {
    return '75.00';
  }
}

async function enviarReporteStock(chatId: string) {
  const { data: prods } = await supabase
    .from('productos')
    .select('nombre, stock')
    .lt('stock', 10)
    .order('stock', { ascending: true });
  if (!prods || prods.length === 0)
    return enviarMensaje(chatId, '✅ Inventario al día, jefe.');
  const lista = prods.map((p) => `⚠️ ${p.nombre}: *${p.stock}*`).join('\n');
  await enviarMensaje(chatId, `📦 *STOCK BAJO*\n\n${lista}`);
}

async function enviarMensaje(chatId: string, texto: string) {
  const token = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: texto,
      parse_mode: 'Markdown',
    }),
  });
}
