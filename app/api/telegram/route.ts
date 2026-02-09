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

    // 1. LE DAMOS CONTEXTO DE LA BASE DE DATOS A GEMINI
    // Aquí podrías traer una muestra de datos o la tasa actual de una tabla
    const { data: tasaData } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'tasa_bcv')
      .single();
    const tasaActual = tasaData?.valor || 'no definida';

    const promptGlobal = `
      Eres el asistente inteligente de "FERREMATERIALES LER C.A.".
      Tienes acceso a la base de datos de la ferretería.
      Tasa BCV hoy: ${tasaActual}.
      
      El jefe dice: "${text}"
      
      Tu tarea es decidir qué información necesito buscar. Responde SOLAMENTE con una de estas etiquetas:
      [PRECIO:nombre_producto] -> Si pregunta cuánto cuesta algo.
      [STOCK_INDIVIDUAL:nombre_producto] -> Si pregunta cuánto queda de un producto específico.
      [INVENTARIO_GENERAL] -> Si quiere ver todo lo que falta o stock bajo.
      [VENTAS_HOY] -> Si pregunta por el dinero del día o cierre.
      [TASA] -> Si pregunta por el dólar o tasa.
      [SALUDO] -> Si solo saluda.
    `;

    // 2. LLAMADA A LA IA PARA DECIDIR ACCIÓN
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
    const decision = data.candidates[0].content.parts[0].text.trim();

    // 3. EJECUCIÓN SEGÚN LENGUAJE NATURAL
    if (decision.includes('[PRECIO:')) {
      const producto = decision.split(':')[1].replace(']', '');
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
        '👋 ¡Hola Jefe! Estoy listo. Puedo darle precios, stock de productos, ventas del día o la tasa BCV. ¿Qué necesita saber?',
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ ok: true });
  }
}

// --- NUEVA FUNCIÓN: BUSCAR PRECIO DE UN PRODUCTO ESPECÍFICO ---
async function buscarPrecio(
  chatId: string,
  nombreBusqueda: string,
  apiKey: string,
) {
  const { data: prods } = await supabase
    .from('productos')
    .select('nombre, precio_usd, stock')
    .ilike('nombre', `%${nombreBusqueda}%`) // Busca coincidencias parciales
    .limit(3);

  if (!prods || prods.length === 0) {
    return enviarMensaje(
      chatId,
      `No encontré ningún producto que se llame "${nombreBusqueda}".`,
    );
  }

  // Usamos la IA para que redacte la respuesta bonito
  const promptRedaccion = `
    El jefe preguntó por el precio de "${nombreBusqueda}".
    Encontré estos datos: ${JSON.stringify(prods)}.
    Redacta una respuesta breve y profesional para el jefe informando precios y stock.
  `;

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
  await enviarMensaje(chatId, dataIA.candidates[0].content.parts[0].text);
}

// ... (Manten tus funciones de enviarCierreCaja y enviarReporteStock igual)

// --- TUS FUNCIONES DE CONSULTA (Optimizadas) ---

async function enviarCierreCaja(chatId: string) {
  const hoy = new Date()
    .toLocaleString('en-US', { timeZone: 'America/Caracas' })
    .split(',')[0];
  // Convertimos a formato YYYY-MM-DD para Supabase
  const d = new Date(hoy);
  const fechaFormateada = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

  const { data: cots } = await supabase
    .from('cotizaciones')
    .select('*')
    .eq('estado', 'aprobado')
    .gte('created_at', fechaFormateada);

  if (!cots || cots.length === 0) {
    return enviarMensaje(
      chatId,
      '📭 Jefe, aún no hay ventas aprobadas registradas el día de hoy.',
    );
  }

  const totalBs = cots
    .filter((c) => c.moneda === 'BS')
    .reduce((acc, curr) => acc + curr.total * (curr.tasa_bcv || 1), 0);

  const totalUsd = cots
    .filter((c) => c.moneda === 'USD')
    .reduce((acc, curr) => acc + curr.total, 0);

  const mensaje =
    `💰 *REPORTE DE VENTAS (HOY)*\n` +
    `--------------------------\n` +
    `🇻🇪 *Bolívares:* Bs. ${totalBs.toLocaleString('es-VE')}\n` +
    `💵 *Dólares:* $${totalUsd.toLocaleString()}\n` +
    `📈 *Ventas:* ${cots.length}\n` +
    `--------------------------`;

  await enviarMensaje(chatId, mensaje);
}

async function enviarReporteStock(chatId: string) {
  const { data: prods } = await supabase
    .from('productos')
    .select('nombre, stock')
    .lt('stock', 10)
    .order('stock', { ascending: true });

  if (!prods || prods.length === 0) {
    return enviarMensaje(
      chatId,
      '✅ Jefe, el inventario está al día. No hay productos con stock crítico.',
    );
  }

  const lista = prods.map((p) => `⚠️ ${p.nombre}: *${p.stock}*`).join('\n');
  await enviarMensaje(chatId, `📦 *ALERTAS DE INVENTARIO*\n\n${lista}`);
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
