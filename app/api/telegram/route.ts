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

    // 2. DETECCIÓN DE INTENCIÓN (Mejorada)
    let intent = '[OTRO]';

    try {
      const apiKey = 'AIzaSyAY3_HRuhvrwwDZTXBDGBjTofAKsiBU3jQ';
      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Analiza el mensaje del dueño de una ferretería: "${text}". 
          Si pregunta por inventario, existencias, productos o qué falta, responde únicamente: [STOCK].
          Si pregunta por ventas, dinero, caja o cierre, responde únicamente: [CIERRE].
          Si es un saludo u otra cosa, responde: [OTRO].`,
                  },
                ],
              },
            ],
          }),
        },
      );

      const data = await aiResponse.json();

      if (data.candidates && data.candidates[0].content.parts[0].text) {
        // Limpiamos la respuesta por si la IA agrega puntos o espacios
        intent = data.candidates[0].content.parts[0].text.toUpperCase().trim();
        console.log('IA detectó intención:', intent);
      }
    } catch (e) {
      console.error('Error en llamada a IA');
    }

    // 3. LÓGICA DE DECISIÓN (Más agresiva para no fallar)
    const msg = text.toLowerCase();

    // Verificamos tanto lo que dijo la IA como palabras clave manuales
    if (
      intent.includes('CIERRE') ||
      msg.includes('cierre') ||
      msg.includes('venta') ||
      msg.includes('caja') ||
      msg.includes('plata') ||
      msg.includes('cuanto se hizo')
    ) {
      await enviarCierreCaja(chatId);
    } else if (
      intent.includes('STOCK') ||
      msg.includes('stock') ||
      msg.includes('inventario') ||
      msg.includes('falta') ||
      msg.includes('productos') ||
      msg.includes('existencia')
    ) {
      await enviarReporteStock(chatId);
    } else {
      await enviarMensaje(
        chatId,
        '👋 ¡Hola Jefe! No estoy seguro de qué reporte necesita.\n\nEscriba *cierre* para las ventas o *stock* para el inventario.',
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error general Webhook:', error);
    return NextResponse.json({ ok: true }); // Siempre responder OK a Telegram para evitar bucles
  }
}

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
