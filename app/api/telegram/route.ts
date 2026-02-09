import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Ajusta la ruta a tu config de supabase

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const chatId = body.message?.chat?.id.toString();
    const text = body.message?.text?.toLowerCase();

    // SEGURIDAD: Solo responde a tu ID de Telegram
    if (chatId !== process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID) {
      return NextResponse.json({ ok: true });
    }

    if (text === '/cierre' || text === 'cierre' || text === 'ventas hoy') {
      await enviarCierreCaja(chatId);
    } else if (
      text === '/inventario' ||
      text === 'inventario bajo' ||
      text === 'stock'
    ) {
      await enviarReporteStock(chatId);
    } else {
      await enviarMensaje(
        chatId,
        'Hola Jefe. Comandos disponibles:\n\n📊 *cierre* - Ver ventas de hoy\n📦 *stock* - Ver productos bajos',
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error Webhook:', error);
    return NextResponse.json({ ok: true });
  }
}

// --- FUNCIONES DE CONSULTA ---

async function enviarCierreCaja(chatId: string) {
  const hoy = new Date().toISOString().split('T')[0];

  const { data: cots } = await supabase
    .from('cotizaciones')
    .select('*')
    .eq('estado', 'aprobado')
    .gte('created_at', hoy);

  if (!cots || cots.length === 0) {
    return enviarMensaje(
      chatId,
      '📭 Jefe, aún no se han registrado ventas aprobadas el día de hoy.',
    );
  }

  const totalBs = cots
    .filter((c) => c.moneda === 'BS')
    .reduce((acc, curr) => acc + curr.total * (curr.tasa_bcv || 1), 0);

  const totalUsd = cots
    .filter((c) => c.moneda === 'USD')
    .reduce((acc, curr) => acc + curr.total, 0);

  const mensaje =
    `💰 *CIERRE DE CAJA (HOY)*\n` +
    `--------------------------\n` +
    `🇻🇪 *Bolívares:* Bs. ${totalBs.toLocaleString('es-VE')}\n` +
    `💵 *Dólares:* $${totalUsd.toLocaleString()}\n` +
    `--------------------------\n` +
    `📈 *Ventas cerradas:* ${cots.length}\n` +
    `📅 Fecha: ${new Date().toLocaleDateString()}`;

  await enviarMensaje(chatId, mensaje);
}

async function enviarReporteStock(chatId: string) {
  const { data: prods } = await supabase
    .from('productos')
    .select('nombre, stock')
    .lt('stock', 10) // Cambia el 10 por tu límite de stock bajo
    .order('stock', { ascending: true });

  if (!prods || prods.length === 0) {
    return enviarMensaje(
      chatId,
      '✅ Jefe, todo el inventario está en niveles óptimos.',
    );
  }

  const lista = prods.map((p) => `⚠️ ${p.nombre}: *${p.stock}*`).join('\n');
  await enviarMensaje(chatId, `📦 *STOCK BAJO (ALERTA)*\n\n${lista}`);
}

// --- FUNCIÓN PARA ENVIAR RESPUESTA ---
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
