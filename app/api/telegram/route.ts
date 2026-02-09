import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const chatId = body.message?.chat?.id.toString();
    const userMessage = body.message?.text;

    if (chatId !== process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID) {
      return NextResponse.json({ ok: true });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 1. LA IA DETERMINA LA INTENCIÓN
    const promptIntent = `Eres el asistente de una ferretería. El jefe dice: "${userMessage}".
    Debes clasificar su mensaje en una sola palabra dentro de estos corchetes:
    [CIERRE] - Si pregunta por ventas, dinero, caja o cómo fue el día.
    [STOCK] - Si pregunta por productos, inventario, qué falta o stock bajo.
    [SALUDO] - Si solo saluda o pregunta quién eres.
    [OTRO] - Si no entiendes o es otra cosa.
    Responde solo la etiqueta.`;

    const resultIntent = await model.generateContent(promptIntent);
    const intent = resultIntent.response.text().trim();

    // 2. EJECUTAMOS LA LÓGICA SEGÚN LA IA
    if (intent.includes('[CIERRE]')) {
      const datos = await obtenerDatosCierre();
      await enviarRespuestaIA(chatId, userMessage, datos, 'ventas y caja');
    } else if (intent.includes('[STOCK]')) {
      const datos = await obtenerDatosStock();
      await enviarRespuestaIA(chatId, userMessage, datos, 'inventario bajo');
    } else {
      // Para saludos o desconocidos, que la IA responda amigablemente
      const promptFriendly = `Eres el asistente de FERREMATERIALES LER C.A. El jefe dice: "${userMessage}". Responde cordialmente y dile que puedes darle reportes de ventas o stock.`;
      const res = await model.generateContent(promptFriendly);
      await enviarMensaje(chatId, res.response.text());
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error Webhook:', error);
    return NextResponse.json({ ok: true });
  }
}

// --- NUEVA FUNCIÓN: LA IA REDACTA EL REPORTE FINAL ---
async function enviarRespuestaIA(
  chatId: string,
  preguntaJefe: string,
  datos: any,
  tipo: string,
) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const promptFinal = `
    Eres el asistente inteligente de la ferretería FERREMATERIALES LER C.A.
    El jefe preguntó: "${preguntaJefe}"
    Aquí tienes los datos reales del sistema sobre ${tipo}: ${JSON.stringify(datos)}
    
    Tu tarea: Redacta un mensaje breve y profesional para Telegram. 
    - Si son ventas, resume el total en Bs y $. 
    - Si es stock, menciona los productos más críticos.
    - Usa emojis y negritas. Si no hay datos, infórmalo amablemente.
  `;

  const result = await model.generateContent(promptFinal);
  await enviarMensaje(chatId, result.response.text());
}

// --- FUNCIONES AUXILIARES PARA OBTENER DATOS ---

async function obtenerDatosCierre() {
  const hoy = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('cotizaciones')
    .select('*')
    .eq('estado', 'aprobado')
    .gte('created_at', hoy);

  if (!data) return 'No hay ventas hoy';

  const totalBs = data
    .filter((c) => c.moneda === 'BS')
    .reduce((acc, curr) => acc + curr.total * (curr.tasa_bcv || 1), 0);
  const totalUsd = data
    .filter((c) => c.moneda === 'USD')
    .reduce((acc, curr) => acc + curr.total, 0);

  return {
    total_bolivares: totalBs,
    total_dolares: totalUsd,
    cantidad_ventas: data.length,
  };
}

async function obtenerDatosStock() {
  const { data } = await supabase
    .from('productos')
    .select('nombre, stock')
    .lt('stock', 10)
    .order('stock', { ascending: true });
  return data || [];
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
