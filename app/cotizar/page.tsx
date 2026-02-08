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
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [tasaBCV, setTasaBCV] = useState<number>(382.63); // Valor inicial por defecto
  // FORMA CORRECTA
  const [monedaPrincipal, setMonedaPrincipal] = useState<'USD' | 'BS'>('USD');

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

      // --- 1. LOGO Y MEMBRETE ---
      const logoUrl = '/logo3_ferremateriales.png';
      try {
        // Reducimos un poco el ancho a 45 para que no pise el texto de la derecha
        doc.addImage(logoUrl, 'PNG', 10, 10, 35, 35);
      } catch (e) {
        console.error('Error logo', e);
      }

      // Datos de la Empresa (Desplazados a la derecha para no chocar con el logo)
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('FERREMATERIALES LER C.A.', 50, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('RIF: J-501123764', 50, 32);
      doc.text('Calidad y confianza en cada material', 50, 37);

      // Etiqueta COTIZACIÓN (Aislada a la derecha)
      doc.setTextColor(colorDorado[0], colorDorado[1], colorDorado[2]);
      doc.setFontSize(16);
      doc.text('COTIZACIÓN', 196, 25, { align: 'right' });
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`N°: ${Math.floor(Date.now() / 10000)}`, 196, 32, {
        align: 'right',
      });
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 196, 37, {
        align: 'right',
      });

      // Línea divisoria (La bajamos a 58 para dar aire al logo)
      doc.setDrawColor(colorDorado[0], colorDorado[1], colorDorado[2]);
      doc.setLineWidth(1);
      doc.line(14, 58, 196, 58);

      // --- 2. CAJA DE CLIENTE CON TEXTO ENVOLVENTE ---
      doc.setDrawColor(226, 232, 240);
      // Dibujamos el cuadro (lo hacemos un poco más alto por si la nota es larga)
      doc.roundedRect(14, 65, 182, 35, 2, 2);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENTE:', 20, 72);
      doc.text('RIF / C.I.:', 20, 79);
      doc.text('DESTINO:', 20, 86);

      doc.setFont('helvetica', 'normal');
      doc.text(`${cliente.nombre.toUpperCase()}`, 45, 72);
      doc.text(`${cliente.cedula || 'N/A'}`, 45, 79);

      // CLAVE: Ajuste de texto para la nota/dirección
      // splitTextToSize corta el texto para que no pase de 140mm de ancho
      const textoDestino = notasExtra || 'Retiro en tienda / Por definir';
      const notasCortadas = doc.splitTextToSize(textoDestino, 140);
      doc.text(notasCortadas, 45, 86);

      // --- 3. TABLA UNIFICADA ---
      const simbolo = monedaPrincipal === 'BS' ? 'Bs.' : '$';
      const factor = monedaPrincipal === 'BS' ? tasaBCV : 1;

      autoTable(doc, {
        startY: 105,
        head: [
          [
            'DESCRIPCIÓN',
            'CANT.',
            `PRECIO (${monedaPrincipal})`,
            `SUBTOTAL (${monedaPrincipal})`,
          ],
        ],
        body: items.map((i) => [
          i.nombre.toUpperCase(),
          i.cantidad,
          `${simbolo} ${(i.precio * factor).toLocaleString(monedaPrincipal === 'BS' ? 'es-VE' : 'en-US', { minimumFractionDigits: 2 })}`,
          `${simbolo} ${(i.precio * i.cantidad * factor).toLocaleString(monedaPrincipal === 'BS' ? 'es-VE' : 'en-US', { minimumFractionDigits: 2 })}`,
        ]),
        headStyles: { fillColor: [30, 41, 59], halign: 'center' },
        styles: { fontSize: 8 },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
      });

      // --- 4. TOTAL ---
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      const totalFinal = total * factor;

      doc.setFontSize(16);
      doc.setTextColor(colorDorado[0], colorDorado[1], colorDorado[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `TOTAL A PAGAR: ${simbolo} ${totalFinal.toLocaleString(monedaPrincipal === 'BS' ? 'es-VE' : 'en-US', { minimumFractionDigits: 2 })}`,
        196,
        finalY,
        {
          align: 'right',
        },
      );

      // Opcional: Agregar una pequeña nota al pie indicando la tasa si la cotización es en Bs.
      if (monedaPrincipal === 'BS') {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Tasa de cambio aplicada: 1 USD = ${tasaBCV} Bs.`,
          14,
          finalY + 5,
        );
      }

      doc.save(`Cotizacion_LER_${cliente.nombre}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error al generar PDF');
    }
  };

  const enviarWhatsApp = (
    cliente: any,
    total: number,
    items: any[],
    notas: string,
    moneda: string,
    tasa: number,
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
    const factor = moneda === 'BS' ? tasa : 1;
    const simbolo = moneda === 'BS' ? 'Bs.' : '$';

    const listaProd = items
      .map((i) => {
        const subtotal = (i.precio * i.cantidad * factor).toLocaleString(
          'es-VE',
          { minimumFractionDigits: 2 },
        );
        return `🔹 *${i.nombre.trim()}*\nCant: ${i.cantidad} -> ${simbolo}${subtotal}`;
      })
      .join('\n\n');

    const totalTexto = `${simbolo} ${(total * factor).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;

    const textoMensaje = `🏗️ *FERREMATERIALES LER C.A.*
    --------------------------------------------
    👤 *Cliente:* ${cliente.nombre}
    🆔 *C.I./RIF:* ${cliente.cedula || 'N/A'}
    📍 *Entrega:* ${notas || 'Retiro en tienda'}
    💰 *Moneda:* ${moneda === 'BS' ? 'Bolívares (BCV)' : 'Dólares'}

    📝 *RESUMEN:*
    ${listaProd}

    💵 *TOTAL A PAGAR: ${totalTexto}*
    --------------------------------------------
    ${moneda === 'BS' ? `_Tasa del día: ${tasa} Bs._\n` : ''}
    🛠️ *¡Estamos para servirle!*`;

    // 3. LA CLAVE: Usar encodeURIComponent para que los emojis viajen como código seguro
    const url = `https://wa.me/${telLimpio}?text=${encodeURIComponent(textoMensaje)}`;

    // Abrir en ventana nueva
    window.open(url, '_blank');
  };

  // --- LÓGICA DE TELEGRAM (RESTAURADA) ---
  // 1. Cambia la firma de la función para recibir moneda y tasa
  const enviarTelegram = async (
    cliente: any,
    total: number,
    items: any[],
    moneda: string,
    tasa: number,
  ) => {
    const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

    // Calculamos montos según la moneda
    const factor = moneda === 'BS' ? tasa : 1;
    const simbolo = moneda === 'BS' ? 'Bs.' : '$';
    const montoFinal = (total * factor).toLocaleString(
      moneda === 'BS' ? 'es-VE' : 'en-US',
      { minimumFractionDigits: 2 },
    );

    const listaProd = items
      .map((i) => `- ${i.nombre} (x${i.cantidad})`)
      .join('\n');

    // Incluimos la moneda en el mensaje
    const texto = `🛠️ *FERREMATERIALES LER C.A.*\n\n📄 *Nueva Cotización (${moneda})*\n👤 *Cliente:* ${cliente.nombre}\n💰 *Total:* ${simbolo} ${montoFinal}\n${moneda === 'BS' ? `📈 *Tasa:* ${tasa} Bs/$\n` : ''}\n📌 *Estado:* PENDIENTE\n\n*Items:*\n${listaProd}`;

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

      await enviarTelegram(
        clienteSeleccionado,
        total,
        carrito,
        monedaPrincipal,
        tasaBCV,
      );
      descargarPDF(clienteSeleccionado, carrito, total, observaciones);

      // El flujo de WhatsApp se lanza en paralelo
      setTimeout(() => {
        if (confirm('¿Deseas enviar el resumen por WhatsApp ahora?')) {
          enviarWhatsApp(
            clienteSeleccionado,
            total,
            carrito,
            observaciones,
            monedaPrincipal,
            tasaBCV,
          );
        }
      }, 500); // Cerramos el setTimeout aquí con });

      // Estas acciones ocurren de inmediato
      alert('¡Cotización procesada con éxito!');
      setCarrito([]);
      setClienteSeleccionado(null);
      setObservaciones('');
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

          {/* REEMPLAZO DEL SELECT POR BUSCADOR INTELIGENTE */}
          <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">
              Cliente (Busca por Nombre, RIF o Cédula)
            </label>

            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={24}
              />
              <input
                type="text"
                placeholder="Escribir para buscar cliente..."
                className="w-full pl-14 pr-12 py-5 bg-slate-50 rounded-[1.5rem] outline-none ring-2 ring-slate-100 text-xl font-bold transition-all focus:ring-blue-500"
                // Si hay un cliente seleccionado, mostramos su nombre, si no, lo que se esté escribiendo
                value={
                  clienteSeleccionado
                    ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido || ''}`
                    : busquedaCliente
                }
                onChange={(e) => {
                  setBusquedaCliente(e.target.value);
                  if (clienteSeleccionado) setClienteSeleccionado(null);
                }}
              />

              {/* Botón para limpiar selección */}
              {clienteSeleccionado && (
                <button
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setBusquedaCliente('');
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-200 p-2 rounded-full text-slate-600 hover:bg-red-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* LISTA DE RESULTADOS FILTRADOS (Aparece solo mientras buscas) */}
            {!clienteSeleccionado && busquedaCliente.length > 0 && (
              <div className="absolute z-[100] left-6 right-6 mt-2 bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-h-[350px] overflow-y-auto p-3 custom-scroll">
                {clientes
                  .filter((c) => {
                    const term = busquedaCliente.toLowerCase();
                    return (
                      c.nombre?.toLowerCase().includes(term) ||
                      c.apellido?.toLowerCase().includes(term) ||
                      c.cedula?.toString().includes(term) ||
                      c.rif?.toLowerCase().includes(term)
                    );
                  })
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setClienteSeleccionado(c);
                        setBusquedaCliente('');
                      }}
                      className="w-full text-left p-4 hover:bg-blue-50 rounded-2xl transition-all flex flex-col border-b border-slate-50 last:border-none group"
                    >
                      <span className="font-black text-slate-800 text-lg uppercase group-hover:text-blue-600">
                        {c.nombre} {c.apellido || ''}
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-md">
                          ID: {c.cedula || c.rif || 'N/A'}
                        </span>
                        {c.empresa && (
                          <span className="text-xs text-blue-400 font-medium italic">
                            🏢 {c.empresa}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}

                {/* Mensaje cuando no hay resultados */}
                {clientes.filter((c) => {
                  const term = busquedaCliente.toLowerCase();
                  return (
                    c.nombre?.toLowerCase().includes(term) ||
                    c.cedula?.toString().includes(term)
                  );
                }).length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-slate-400 font-bold uppercase text-xs">
                      No se encontró el cliente
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
          {/* --- PANEL DE TASA Y CAMBIO DE MONEDA --- */}
          <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-amber-50 p-4 rounded-[1.5rem] border border-amber-100">
                <DollarSign className="text-amber-600" size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Tasa BCV (Bs/$)
                </p>
                <input
                  type="number"
                  value={tasaBCV}
                  onChange={(e) => setTasaBCV(parseFloat(e.target.value) || 0)}
                  className="text-3xl font-black text-slate-800 bg-transparent outline-none w-32 focus:text-blue-600 transition-colors"
                />
              </div>
            </div>

            <div className="flex bg-slate-100 p-2 rounded-[1.8rem] shadow-inner">
              <button
                onClick={() => setMonedaPrincipal('USD')}
                className={`px-8 py-3 rounded-[1.4rem] font-black text-sm transition-all flex items-center gap-2 ${
                  monedaPrincipal === 'USD'
                    ? 'bg-white text-blue-600 shadow-md scale-105'
                    : 'text-slate-400'
                }`}
              >
                $ USD
              </button>
              <button
                onClick={() => setMonedaPrincipal('BS')}
                className={`px-8 py-3 rounded-[1.4rem] font-black text-sm transition-all flex items-center gap-2 ${
                  monedaPrincipal === 'BS'
                    ? 'bg-white text-emerald-600 shadow-md scale-105'
                    : 'text-slate-400'
                }`}
              >
                Bs BS
              </button>
            </div>
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
                      <div className="flex flex-col">
                        {/* El precio principal siempre en Dólares */}
                        <span className="text-2xl font-black text-blue-600 leading-none">
                          ${p.precio.toLocaleString()}
                        </span>

                        {/* El equivalente en Bs. pequeño abajo (Solo si el switch es BS) */}
                        {monedaPrincipal === 'BS' && (
                          <span className="text-[11px] font-black text-emerald-600 mt-1 uppercase tracking-tighter">
                            ≈ Bs.{' '}
                            {(p.precio * tasaBCV).toLocaleString('es-VE', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        )}
                      </div>

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
                    monedaPrincipal={monedaPrincipal}
                    tasaBCV={tasaBCV}
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
                  <div className="flex flex-col items-end mb-6">
                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">
                      Total a Pagar
                    </span>

                    {/* Monto en Dólares siempre destacado */}
                    <span className="text-4xl font-black text-blue-700 leading-tight">
                      ${calcularTotal().toLocaleString()}
                    </span>

                    {/* Monto en Bolívares justo debajo como referencia principal */}
                    <div className="flex items-center gap-2 bg-emerald-50 px-4 py-1 rounded-full border border-emerald-100 mt-1">
                      <span className="text-xs font-black text-emerald-700 uppercase">
                        Bs.
                      </span>
                      <span className="text-lg font-black text-emerald-600">
                        {(calcularTotal() * tasaBCV).toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
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
                  <div className="flex flex-col items-end mb-6">
                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">
                      Total a Pagar
                    </span>

                    {/* Monto en Dólares siempre destacado */}
                    <span className="text-4xl font-black text-blue-700 leading-tight">
                      ${calcularTotal().toLocaleString()}
                    </span>

                    {/* Monto en Bolívares justo debajo como referencia principal */}
                    <div className="flex items-center gap-2 bg-emerald-50 px-4 py-1 rounded-full border border-emerald-100 mt-1">
                      <span className="text-xs font-black text-emerald-700 uppercase">
                        Bs.
                      </span>
                      <span className="text-lg font-black text-emerald-600">
                        {(calcularTotal() * tasaBCV).toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end justify-center">
          {/* Contenedor Principal del Modal */}
          <div className="bg-slate-100 w-full max-w-2xl h-[92vh] rounded-t-[3rem] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            {/* Indicador visual de "arrastre" (estilo iPhone) */}
            <div className="w-full flex justify-center pt-3 pb-1 shrink-0 bg-white">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            {/* CABECERA FIJA */}
            <div className="px-6 py-4 border-b bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-800 leading-none">
                  Mi Carrito
                </h2>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">
                  {carrito.length} productos seleccionados
                </p>
              </div>
              <button
                onClick={() => setMostrarModalResumen(false)}
                className="p-3 bg-slate-100 text-slate-500 rounded-full active:scale-90 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* CUERPO CON SCROLL - Aquí cambiamos el fondo a slate-100 para que las tarjetas blancas resalten */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100"
              style={{ overscrollBehavior: 'contain' }} // <--- CLAVE: Evita recargar la página al llegar al tope
            >
              <div className="space-y-3">
                {carrito.map((item) => (
                  <div
                    key={`mobile-${item.id}`}
                    className="bg-white rounded-[2rem] p-1 shadow-md border border-white"
                  >
                    <TarjetaProductoCarrito
                      item={item}
                      actualizarItem={actualizarItem}
                      setCarrito={setCarrito}
                      carrito={carrito}
                      monedaPrincipal={monedaPrincipal}
                      tasaBCV={tasaBCV}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setMostrarModalResumen(false)}
                className="w-full py-6 mt-4 border-2 border-dashed border-slate-300 rounded-[2rem] text-slate-400 font-black text-xs uppercase tracking-widest active:bg-white transition-all"
              >
                + Agregar más productos
              </button>
            </div>

            {/* PIE DE PÁGINA FIJO (Resumen de Totales) */}
            <div className="p-6 bg-white border-t border-slate-200 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0,05)]">
              <div className="mb-4">
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas de entrega o dirección..."
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 text-sm outline-none focus:border-blue-500 transition-all resize-none"
                  rows={2}
                />
              </div>

              <div className="flex justify-between items-center mb-6 px-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Total Estimado
                  </span>
                  <span className="text-3xl font-black text-blue-600">
                    ${calcularTotal().toLocaleString()}
                  </span>
                </div>
                {monedaPrincipal === 'BS' && (
                  <div className="text-right">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                      En Bolívares
                    </span>
                    <p className="text-xl font-black text-emerald-600 leading-none">
                      Bs. {(calcularTotal() * tasaBCV).toLocaleString('es-VE')}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={procesarCotizacion}
                disabled={cargando}
                className="w-full py-5 rounded-[2rem] bg-blue-600 text-white text-xl font-black shadow-xl shadow-blue-200 active:scale-95 transition-all"
              >
                {cargando ? 'PROCESANDO...' : 'GENERAR COTIZACIÓN'}
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
  monedaPrincipal,
  tasaBCV,
}: any) => (
  <div className="bg-white p-4 rounded-[1.8rem]">
    {' '}
    {/* Reducir padding de 5 a 4 */}
    <div className="flex justify-between items-start mb-2">
      {' '}
      {/* Reducir margen inferior */}
      <span className="text-base font-black text-slate-700 leading-tight flex-1 pr-2">
        {item.nombre}
      </span>
      <button
        onClick={() => setCarrito(carrito.filter((i: any) => i.id !== item.id))}
        className="text-red-400 p-1"
      >
        <Trash2 size={20} />
      </button>
    </div>
    <div className="grid grid-cols-2 gap-3">
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
          Precio Unit. (USD)
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
        {/* Referencia en BS siempre visible si tienes activado el switch de BS */}
        {monedaPrincipal === 'BS' && (
          <p className="text-[10px] font-bold text-emerald-600 mt-1 ml-1">
            = Bs.{' '}
            {(item.precio * tasaBCV).toLocaleString('es-VE', {
              minimumFractionDigits: 2,
            })}
          </p>
        )}
      </div>
    </div>
  </div>
);
