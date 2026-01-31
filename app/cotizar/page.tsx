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
  hashicon,
} from 'lucide-react';

export default function CotizarPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [productosInventario, setProductosInventario] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState(''); // Estado para la barra de búsqueda
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

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

  // Filtrado de productos en tiempo real
  const productosFiltrados = productosInventario.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const agregarAlCarrito = (prod: any) => {
    const existe = carrito.find((item) => item.id === prod.id);
    if (existe) {
      if (existe.cantidad < prod.stock) {
        setCarrito(
          carrito.map((item) =>
            item.id === prod.id
              ? { ...item, cantidad: item.cantidad + 1 }
              : item,
          ),
        );
      }
    } else {
      setCarrito([...carrito, { ...prod, cantidad: 1 }]);
    }
  };

  // Función para actualizar PRECIO o CANTIDAD manualmente
  const actualizarItem = (
    id: string,
    campo: 'precio' | 'cantidad',
    valor: string,
  ) => {
    const numValor = parseFloat(valor) || 0;
    setCarrito(
      carrito.map((item) => {
        if (item.id === id) {
          if (campo === 'cantidad') {
            // No permitir que la cantidad escrita supere el stock real
            const cantFinal = numValor > item.stock ? item.stock : numValor;
            return { ...item, cantidad: cantFinal };
          }
          return { ...item, [campo]: numValor };
        }
        return item;
      }),
    );
  };

  const ajustarCantidadBotones = (id: string, delta: number) => {
    setCarrito(
      carrito.map((item) => {
        if (item.id === id) {
          const nuevaCant = item.cantidad + delta;
          if (nuevaCant >= 1 && nuevaCant <= item.stock) {
            return { ...item, cantidad: nuevaCant };
          }
        }
        return item;
      }),
    );
  };

  const eliminarDelCarrito = (id: string) => {
    setCarrito(carrito.filter((item) => item.id !== id));
  };

  const calcularTotal = () =>
    carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  const enviarTelegram = async (cliente: any, total: number, items: any[]) => {
    const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;
    const listaProd = items
      .map((i) => `- ${i.nombre} (x${i.cantidad})`)
      .join('\n');
    const texto = `📄 *Nueva Cotización*\n👤 *Cliente:* ${cliente.nombre}\n💰 *Total:* $${total.toLocaleString()}\n\n*Items:*\n${listaProd}`;
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
      console.error(e);
    }
  };

  const descargarPDF = (cliente: any, items: any[], total: number) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('COTIZACIÓN COMERCIAL', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(
        `Cliente: ${cliente.nombre} | Fecha: ${new Date().toLocaleDateString()}`,
        14,
        35,
      );
      autoTable(doc, {
        startY: 45,
        head: [['Producto', 'Precio Unit.', 'Cant.', 'Subtotal']],
        body: items.map((i) => [
          i.nombre,
          `$${i.precio}`,
          i.cantidad,
          `$${i.precio * i.cantidad}`,
        ]),
        foot: [['', '', 'TOTAL:', `$${total}`]],
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
      });
      doc.save(`Cotizacion_${cliente.nombre}.pdf`);
    } catch (err) {
      alert('Error al descargar PDF');
    }
  };

  const procesarCotizacion = async () => {
    if (!clienteSeleccionado || carrito.length === 0)
      return alert('Faltan datos');
    setCargando(true);
    try {
      for (const item of carrito) {
        // Obtenemos el stock más actual antes de restar
        const { data: prodActual } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.id)
          .single();
        const nuevoStock = (prodActual?.stock || 0) - item.cantidad;
        await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', item.id);
      }
      const total = calcularTotal();
      await supabase.from('cotizaciones').insert([
        {
          cliente_id: clienteSeleccionado.id,
          productos_seleccionados: carrito,
          total: total,
          estado: 'aprobado',
        },
      ]);
      await enviarTelegram(clienteSeleccionado, total, carrito);
      descargarPDF(clienteSeleccionado, carrito, total);
      alert('Proceso completado con éxito');
      setCarrito([]);
      setClienteSeleccionado(null);
      const { data: p } = await supabase
        .from('productos')
        .select('*')
        .gt('stock', 0);
      if (p) setProductosInventario(p);
    } catch (error) {
      alert('Error en el servidor');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* IZQUIERDA: CATÁLOGO Y CLIENTE */}
        <div className="flex-1 space-y-6">
          <section className="bg-white p-6 rounded-3xl shadow-sm border">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="text-blue-600" /> 1. Datos del Cliente
            </h2>
            <select
              className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) =>
                setClienteSeleccionado(
                  clientes.find((c) => c.id === e.target.value),
                )
              }
              value={clienteSeleccionado?.id || ''}
            >
              <option value="">-- Buscar Cliente --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} | {c.empresa || 'Particular'}
                </option>
              ))}
            </select>
          </section>

          <section className="bg-white p-6 rounded-3xl shadow-sm border">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-xl font-bold">2. Productos disponibles</h2>
              <div className="relative w-full md:w-64">
                <Search
                  className="absolute left-3 top-3 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-[500px] overflow-y-auto pr-2">
              {productosFiltrados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => agregarAlCarrito(p)}
                  className="p-4 rounded-2xl border bg-white hover:border-blue-400 hover:shadow-md text-left transition-all group"
                >
                  <p className="font-bold text-slate-700 group-hover:text-blue-600">
                    {p.nombre}
                  </p>
                  <div className="flex justify-between mt-2 items-center">
                    <span className="text-blue-600 font-black">
                      ${p.precio}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-1 rounded-lg font-bold ${p.stock < 5 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}
                    >
                      STOCK: {p.stock}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* DERECHA: RESUMEN EDITABLE */}
        <div className="w-full lg:w-[450px]">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-blue-50 sticky top-24">
            <h2 className="text-xl font-bold mb-6 border-b pb-4 text-slate-800">
              Detalle de Cotización
            </h2>

            <div className="space-y-4 max-h-[480px] overflow-y-auto mb-6 pr-2">
              {carrito.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4 relative"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-bold text-slate-700 pr-6">
                      {item.nombre}
                    </span>
                    <button
                      onClick={() => eliminarDelCarrito(item.id)}
                      className="text-red-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Input Cantidad con botones laterales opcionales */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">
                        Cantidad
                      </label>
                      <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1">
                        <button
                          onClick={() => ajustarCantidadBotones(item.id, -1)}
                          className="p-1 text-blue-600"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) =>
                            actualizarItem(item.id, 'cantidad', e.target.value)
                          }
                          className="w-full text-center text-sm font-bold outline-none bg-transparent"
                        />
                        <button
                          onClick={() => ajustarCantidadBotones(item.id, 1)}
                          className="p-1 text-blue-600"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Input Precio Editable */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">
                        Precio Unit. ($)
                      </label>
                      <div className="relative">
                        <DollarSign
                          className="absolute left-2 top-2.5 text-slate-400"
                          size={14}
                        />
                        <input
                          type="number"
                          value={item.precio}
                          onChange={(e) =>
                            actualizarItem(item.id, 'precio', e.target.value)
                          }
                          className="w-full pl-7 pr-2 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-blue-600 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs font-bold text-slate-400 pt-2 border-t">
                    Subtotal:{' '}
                    <span className="text-slate-800 text-sm">
                      ${(item.precio * item.cantidad).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              {carrito.length === 0 && (
                <div className="text-center py-16 opacity-40">
                  <FileText className="mx-auto mb-2" size={40} />
                  <p className="text-sm italic">
                    Agregue productos del catálogo
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-slate-500 uppercase text-xs">
                  Total Final
                </span>
                <span className="text-3xl font-black text-blue-700">
                  ${calcularTotal().toLocaleString()}
                </span>
              </div>

              <button
                onClick={procesarCotizacion}
                disabled={
                  cargando || carrito.length === 0 || !clienteSeleccionado
                }
                className="w-full py-4 rounded-2xl font-black text-white bg-blue-600 shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:bg-slate-300"
              >
                {cargando ? 'REGISTRANDO...' : 'APROBAR Y GENERAR PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
