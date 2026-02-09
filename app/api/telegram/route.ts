import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializamos Gemini
const genAI = new GoogleGenerativeAI('AIzaSyAY3_HRuhvrwwDZTXBDGBjTofAKsiBU3jQ');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const chatId = body.message?.chat?.id.toString();
    const text = body.message?.text; // Mensaje original del usuario

    // 1. SEGURIDAD
    if (chatId !== process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID) {
      return NextResponse.json({ ok: true });
    }

    // 2. LLAMADA A LA IA PARA ENTENDER LA INTENCIÓN
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Eres el asistente de la ferretería "FERREMATERIALES LER C.A.". 
    El dueño te pregunta: "${text}".
    
    Tu tarea es clasificar su intención en una sola palabra:
    [CIERRE] -> Si pregunta por ventas, cuánto se hizo hoy, dinero en caja o cierre.
    [STOCK] -> Si pregunta por productos, inventario o qué falta.
    [OTRO] -> Si es un saludo o no se entiende.
    
    Responde solo la palabra entre corchetes.`;

    const result = await model.generateContent(prompt);
    const intent = result.response.text().toUpperCase();

    // 3. LOGICA DE DECISIÓN (Aquí usamos tus funciones que ya funcionan)
    if (intent.includes('[CIERRE]')) {
      await enviarCierreCaja(chatId);
    } else if (intent.includes('[STOCK]')) {
      await enviarReporteStock(chatId);
    } else {
      await enviarMensaje(
        chatId,
        '👋 ¡Hola Jefe! Estoy listo para ayudarle.\n\nPuedes preguntarme cosas como:\n📊 *¿Cómo van las ventas hoy?*\n📦 *¿Qué productos están bajos?*',
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Si la IA falla por la API KEY, el bot no se muere, te avisa:
    console.error('Error Webhook:', error);
    return NextResponse.json({ ok: true });
  }
}

// --- TUS FUNCIONES (Mantenlas exactamente igual) ---

async function enviarCierreCaja(chatId: string) {
  const hoy = new Date().toISOString().split('T')[0];
  const { data: cots } = await supabase
    .from('cotizaciones')
    .select('*')
    .eq('estado', 'aprobado')
    .gte('created_at', hoy);

  if (!cots || cots.length === 0) {
    return enviarMensaje(chatId, '📭 Jefe, aún no hay ventas aprobadas hoy.');
  }

  const totalBs = cots
    .filter((c) => c.moneda === 'BS')
    .reduce((acc, curr) => acc + curr.total * (curr.tasa_bcv || 1), 0);

  const totalUsd = cots
    .filter((c) => c.moneda === 'USD')
    .reduce((acc, curr) => acc + curr.total, 0);

  const mensaje = `💰 *CIERRE DE CAJA*\n🇻🇪 Bs. ${totalBs.toLocaleString('es-VE')}\n💵 $${totalUsd.toLocaleString()}\n📈 Ventas: ${cots.length}`;
  await enviarMensaje(chatId, mensaje);
}

async function enviarReporteStock(chatId: string) {
  const { data: prods } = await supabase
    .from('productos')
    .select('nombre, stock')
    .lt('stock', 10)
    .order('stock', { ascending: true });

  if (!prods || prods.length === 0) {
    return enviarMensaje(chatId, '✅ Inventario óptimo.');
  }

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
