'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Trash2,
  Plus,
  Minus,
  FileText,
  Search,
  DollarSign,
  ShoppingCart,
  ChevronUp,
  X, // Importado para cerrar el modal
} from 'lucide-react';

export default function CotizarPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [productosInventario, setProductosInventario] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarModalResumen, setMostrarModalResumen] = useState(false); // Estado para el modal
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: c } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre');
      const { data: p } = await supabase
        .from('productos')
        .select('*')
        .gt('stock', 0)
        .order('nombre');
      if (c) setClientes(c);
      if (p) setProductosInventario(p);
    };
    cargarDatos();
  }, []);

  // --- LÓGICA DE ACTUALIZACIÓN ---
  // --- LÓGICA DE ACTUALIZACIÓN (ANTI-SALTOS DE SCROLL) ---
  const actualizarItem = (
    id: string,
    campo: 'precio' | 'cantidad',
    valor: string,
  ) => {
    setCarrito((prevCarrito) =>
      prevCarrito.map((item) => {
        if (item.id === id) {
          if (valor === '') return { ...item, [campo]: '' };

          const numValor = parseFloat(valor);
          if (campo === 'cantidad') {
            // Aseguramos que sea un número y respetamos el stock
            const valorLimpio = isNaN(numValor) ? 0 : numValor;
            const cantFinal =
              valorLimpio > item.stock ? item.stock : valorLimpio;
            return { ...item, cantidad: cantFinal };
          }
          return { ...item, [campo]: isNaN(numValor) ? 0 : numValor };
        }
        return item;
      }),
    );
  };

  const calcularTotal = () =>
    carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  const agregarAlCarrito = (prod: any) => {
    const existe = carrito.find((item) => item.id === prod.id);
    if (!existe) setCarrito([...carrito, { ...prod, cantidad: 1 }]);
  };

  const descargarPDF = (
    cliente: any,
    items: any[],
    total: number,
    notasExtra: string,
  ) => {
    try {
      const doc = new jsPDF();
      const colorDorado: [number, number, number] = [184, 134, 11];

      // --- LOGO GRANDE (Estilo Membrete Original) ---
      const logoUrl = '/logo2_ferremateriales.jpeg';
      try {
        // Aumentamos a 55x55 para que destaque
        doc.addImage(logoUrl, 'JPEG', 10, 5, 50, 50);
      } catch (e) {
        console.error('Error logo', e);
      }

      // --- TEXTO EMPRESA (Alineado con el logo) ---
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('FERREMATERIALES LER C.A.', 65, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('RIF: J-50438150-1', 65, 32);
      doc.text('Calidad y confianza en cada material', 65, 38);

      // --- INFO COTIZACIÓN ---
      doc.setTextColor(colorDorado[0], colorDorado[1], colorDorado[2]);
      doc.setFontSize(16);
      doc.text('COTIZACIÓN', 196, 25, { align: 'right' });
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`N°: ${Math.floor(Date.now() / 10000)}`, 196, 32, {
        align: 'right',
      });
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 196, 38, {
        align: 'right',
      });

      // Línea dorada gruesa
      doc.setDrawColor(colorDorado[0], colorDorado[1], colorDorado[2]);
      doc.setLineWidth(1.5);
      doc.line(14, 60, 196, 60);

      // --- CAJA DE CLIENTE ---
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 68, 182, 32, 2, 2);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENTE:', 20, 76);
      doc.text('RIF / C.I.:', 20, 84);
      doc.text('DESTINO:', 20, 92);

      doc.setFont('helvetica', 'normal');
      doc.text(`${cliente.nombre.toUpperCase()}`, 50, 76);
      doc.text(`${cliente.cedula || 'N/A'}`, 50, 84);
      // Aquí aparece la dirección/nota que escribiste
      doc.text(`${notasExtra || 'Retiro en tienda'}`, 50, 92);

      // --- TABLA ---
      autoTable(doc, {
        startY: 105,
        head: [['DESCRIPCIÓN', 'CANT.', 'PRECIO U.', 'SUBTOTAL']],
        body: items.map((i) => [
          i.nombre.toUpperCase(),
          i.cantidad,
          `$${i.precio}`,
          `$${i.precio * i.cantidad}`,
        ]),
        headStyles: { fillColor: [30, 41, 59] },
      });

      // --- TOTAL ---
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(18);
      doc.setTextColor(colorDorado[0], colorDorado[1], colorDorado[2]);
      doc.text(`TOTAL: $ ${total.toLocaleString()}`, 196, finalY, {
        align: 'right',
      });

      doc.save(`Cotizacion_LER_${cliente.nombre}.pdf`);
    } catch (err) {
      alert('Error PDF');
    }
  };

  const enviarWhatsApp = (
    cliente: any,
    total: number,
    items: any[],
    notas: string,
  ) => {
    let telefono = cliente.telefono;

    if (!telefono || telefono.trim() === '') {
      const telIngresado = prompt(
        'Ingresa el número de WhatsApp (ej: 584121234567):',
      );
      if (!telIngresado) return;
      telefono = telIngresado;
    }

    const telLimpio = telefono.replace(/\D/g, '');

    // 1. Formatear la lista de productos de forma limpia
    const listaProd = items
      .map((i) => {
        return `🔹 *${i.nombre.trim()}*\nCant: ${i.cantidad} -> $${(i.precio * i.cantidad).toLocaleString()}`;
      })
      .join('\n\n');

    // 2. Construir el mensaje (usamos emojis normales, son más confiables si se envían bien)
    const textoMensaje = `🏗️ *FERREMATERIALES LER C.A.*
--------------------------------------------

👤 *Cliente:* ${cliente.nombre}
🆔 *C.I./RIF:* ${cliente.cedula || 'N/A'}
📍 *Entrega:* ${notas || 'Retiro en tienda'}

📝 *RESUMEN DE COTIZACIÓN:*

${listaProd}

💵 *TOTAL A PAGAR: $${total.toLocaleString()}*

--------------------------------------------
📄 _El PDF ha sido generado y descargado._
🛠️ *¡Estamos para servirle!*`;

    // 3. LA CLAVE: Usar encodeURIComponent para que los emojis viajen como código seguro
    const url = `https://wa.me/${telLimpio}?text=${encodeURIComponent(textoMensaje)}`;

    // Abrir en ventana nueva
    window.open(url, '_blank');
  };

  // --- LÓGICA DE TELEGRAM (RESTAURADA) ---
  const enviarTelegram = async (cliente: any, total: number, items: any[]) => {
    const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;
    const listaProd = items
      .map((i) => `- ${i.nombre} (x${i.cantidad})`)
      .join('\n');

    const texto = `🛠️ *FERREMATERIALES LER C.A.*\n\n📄 *Nueva Cotización*\n👤 *Cliente:* ${cliente.nombre}\n💰 *Total:* $${total.toLocaleString()}\n\n📌 *Estado:* PENDIENTE\n\n*Items:*\n${listaProd}`;

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: texto,
          parse_mode: 'Markdown',
        }),
      });
    } catch (e) {
      console.error('Error Telegram:', e);
    }
  };

  const procesarCotizacion = async () => {
    if (!clienteSeleccionado || carrito.length === 0)
      return alert('Faltan datos');
    setCargando(true);
    try {
      const total = calcularTotal();
      const { error } = await supabase.from('cotizaciones').insert([
        {
          cliente_id: clienteSeleccionado.id,
          productos_seleccionados: carrito,
          total,
          estado: 'pendiente',
        },
      ]);

      if (error) throw error;

      await enviarTelegram(clienteSeleccionado, total, carrito);
      descargarPDF(clienteSeleccionado, carrito, total, observaciones);

      // El flujo de WhatsApp se lanza en paralelo
      setTimeout(() => {
        if (confirm('¿Deseas enviar el resumen por WhatsApp ahora?')) {
          enviarWhatsApp(clienteSeleccionado, total, carrito, observaciones);
        }
      }, 500); // Cerramos el setTimeout aquí con });

      // Estas acciones ocurren de inmediato
      alert('¡Cotización procesada con éxito!');
      setCarrito([]);
      setClienteSeleccionado(null);
      setMostrarModalResumen(false);
    } catch (e) {
      console.error(e);
      alert('Error al procesar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 pb-32">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* IZQUIERDA: BUSCADOR Y PRODUCTOS */}
        <div className="flex-1 space-y-6">
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter">
            Cotizar
          </h1>

          <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <select
              className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none ring-2 ring-slate-100 text-xl font-bold outline-none"
              onChange={(e) =>
                setClienteSeleccionado(
                  clientes.find((c) => c.id === e.target.value),
                )
              }
              value={clienteSeleccionado?.id || ''}
            >
              <option value="">-- Seleccionar Cliente --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.empresa && `(${c.empresa})`}
                </option>
              ))}
            </select>
          </section>

          <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="relative mb-6">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={24}
              />
              <input
                type="text"
                placeholder="Buscar producto..."
                className="w-full pl-14 pr-4 py-5 bg-slate-50 rounded-[1.5rem] outline-none ring-2 ring-slate-100 text-xl font-medium"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[500px] overflow-y-auto pr-2">
              {productosInventario
                .filter((p) =>
                  p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
                )
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => agregarAlCarrito(p)}
                    className={`p-6 rounded-[2rem] border-2 text-left transition-all relative ${
                      carrito.find((i) => i.id === p.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-100 bg-white'
                    }`}
                  >
                    {/* ESTE ES EL CONTADOR RESTAURADO */}
                    {carrito.find((i) => i.id === p.id) && (
                      <div className="absolute -top-3 -right-3 bg-blue-600 text-white font-black w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-lg ring-4 ring-white">
                        {carrito.find((i) => i.id === p.id).cantidad}
                      </div>
                    )}
                    <p className="font-black text-xl text-slate-800 mb-2">
                      {p.nombre}
                    </p>
                    <div className="flex justify-between items-end">
                      <span className="text-2xl font-black text-blue-600">
                        ${p.precio}
                      </span>
                      <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-500 rounded-lg">
                        Stock: {p.stock}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </section>
        </div>

        {/* DERECHA: RESUMEN (VISIBLE EN ESCRITORIO) */}
        <div className="hidden lg:block w-[450px]">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-blue-50 sticky top-8">
            <h2 className="text-2xl font-black mb-6 text-slate-800 flex justify-between">
              Resumen <ShoppingCart className="text-blue-500" />
            </h2>
            {/* AQUÍ DEFINIMOS EL SCROLL PARA PC */}
            <div className="max-h-[500px] overflow-y-auto pr-2 custom-scroll">
              {/* Busca donde estaba <ListadoResumen /> en la parte de PC y cámbialo por esto: */}
              <div className="space-y-4">
                {carrito.map((item) => (
                  <TarjetaProductoCarrito
                    key={`pc-${item.id}`}
                    item={item}
                    actualizarItem={actualizarItem}
                    setCarrito={setCarrito}
                    carrito={carrito}
                  />
                ))}
              </div>
            </div>
            <div className="mt-6 pt-6 border-t-4 border-dashed border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <div className="mb-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Notas / Dirección de Envío
                  </label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej: Entrega en Obra - Av. Bolívar / Contactar a Ing. Pérez..."
                    className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 text-sm outline-none focus:border-blue-500 transition-all resize-none"
                    rows={3}
                  />
                </div>
                <span className="text-sm font-black text-slate-400 uppercase">
                  Total
                </span>
                <span className="text-4xl font-black text-blue-700">
                  ${calcularTotal().toLocaleString()}
                </span>
              </div>
              <button
                onClick={procesarCotizacion}
                disabled={
                  cargando || carrito.length === 0 || !clienteSeleccionado
                }
                className="w-full py-5 rounded-[2rem] font-black text-xl text-white bg-blue-600 shadow-xl shadow-blue-200"
              >
                {cargando ? 'REGISTRANDO...' : 'GENERAR COTIZACIÓN'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- CARRITO FLOTANTE MÓVIL --- */}
      {carrito.length > 0 && !mostrarModalResumen && (
        <div className="lg:hidden fixed bottom-8 left-4 right-4 z-[90]">
          <button
            onClick={() => setMostrarModalResumen(true)}
            className="w-full bg-slate-900 text-white p-5 rounded-[2.5rem] shadow-2xl flex items-center justify-between border border-white/10"
          >
            <div className="flex items-center gap-4">
              <div className="relative bg-blue-600 p-3 rounded-2xl">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 bg-red-500 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900">
                  {carrito.length} {/* Contador de TIPOS de productos */}
                </span>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase">
                  Total
                </p>
                <p className="text-2xl font-black">
                  ${calcularTotal().toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 font-black text-blue-400">
              {' '}
              REVISAR <ChevronUp size={20} />
            </div>
          </button>
        </div>
      )}

      {mostrarModalResumen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-2xl h-[90vh] rounded-t-[3rem] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full">
            {/* CABECERA FIJA */}
            <div className="p-6 border-b flex justify-between items-center bg-white shrink-0">
              <h2 className="text-2xl font-black text-slate-800">Resumen</h2>
              <button
                onClick={() => setMostrarModalResumen(false)}
                className="p-3 bg-slate-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            {/* CUERPO CON SCROLL ESTABLE */}
            {/* Importante: id="modal-scroll-area" para control de scroll */}
            <div
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {/* Busca donde estaba <ListadoResumen /> en la parte de PC y cámbialo por esto: */}
              <div className="space-y-4">
                {carrito.map((item) => (
                  <TarjetaProductoCarrito
                    key={`pc-${item.id}`}
                    item={item}
                    actualizarItem={actualizarItem}
                    setCarrito={setCarrito}
                    carrito={carrito}
                  />
                ))}
              </div>
              <button
                onClick={() => setMostrarModalResumen(false)}
                className="w-full py-4 border-2 border-dashed border-blue-200 rounded-3xl text-blue-500 font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all"
              >
                + Seguir agregando productos
              </button>
            </div>

            {/* PIE DE PÁGINA FIJO */}
            <div className="p-8 bg-white border-t border-slate-100 shrink-0">
              {/* AGREGAR ESTO AQUÍ: */}
              <div className="mb-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Notas / Dirección de Envío
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej: Entrega en obra, contacto..."
                  className="w-full p-3 bg-slate-50 rounded-2xl border-2 border-slate-100 text-sm outline-none focus:border-blue-500 transition-all resize-none"
                  rows={2}
                />
              </div>
              <div className="flex justify-between items-end mb-6">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  Total Cotización
                </span>
                <span className="text-4xl font-black text-blue-600">
                  ${calcularTotal().toLocaleString()}
                </span>
              </div>
              <button
                onClick={procesarCotizacion}
                disabled={cargando}
                className="w-full py-6 rounded-[2rem] bg-blue-600 text-white text-2xl font-black shadow-xl shadow-blue-200 active:scale-95 transition-all"
              >
                {cargando ? 'REGISTRANDO...' : 'FINALIZAR VENTA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
// PEGA ESTO AL FINAL DEL ARCHIVO (fuera de todo)
const TarjetaProductoCarrito = ({
  item,
  actualizarItem,
  setCarrito,
  carrito,
}: any) => (
  <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <span className="text-lg font-black text-slate-700 leading-tight flex-1">
        {item.nombre}
      </span>
      <button
        onClick={() => setCarrito(carrito.filter((i: any) => i.id !== item.id))}
        className="text-red-400 p-1"
      >
        <Trash2 size={20} />
      </button>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Cant.
        </label>
        <div className="flex items-center bg-white rounded-2xl ring-1 ring-slate-200 p-1">
          <button
            onPointerDown={(e) => e.preventDefault()}
            onClick={() =>
              actualizarItem(
                item.id,
                'cantidad',
                (Number(item.cantidad || 0) - 1).toString(),
              )
            }
            className="p-2 text-blue-600"
          >
            <Minus size={18} />
          </button>
          <input
            type="number"
            value={item.cantidad}
            onChange={(e) =>
              actualizarItem(item.id, 'cantidad', e.target.value)
            }
            className="w-full text-center font-black text-lg outline-none bg-transparent"
          />
          <button
            onPointerDown={(e) => e.preventDefault()}
            onClick={() =>
              actualizarItem(
                item.id,
                'cantidad',
                (Number(item.cantidad || 0) + 1).toString(),
              )
            }
            className="p-2 text-blue-600"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Precio Unit.
        </label>
        <div className="relative">
          <DollarSign
            className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"
            size={16}
          />
          <input
            type="number"
            value={item.precio}
            onChange={(e) => actualizarItem(item.id, 'precio', e.target.value)}
            className="w-full pl-8 pr-3 py-3 bg-white rounded-2xl ring-1 ring-slate-200 font-black text-blue-600 outline-none"
          />
        </div>
      </div>
    </div>
  </div>
);
