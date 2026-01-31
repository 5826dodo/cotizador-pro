'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trash2, Plus, Minus, FileText } from 'lucide-react';

export default function CotizarPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [productosInventario, setProductosInventario] = useState<any[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: c } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre');
      // FILTRO: Solo traer productos cuyo stock sea mayor a 0
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
      } else {
        alert('Límite de stock alcanzado para este producto');
      }
    } else {
      setCarrito([...carrito, { ...prod, cantidad: 1 }]);
    }
  };

  const ajustarCantidad = (id: string, delta: number) => {
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
      .map((i) => `- ${i.nombre} (x${i.cantidad}) - $${i.precio * i.cantidad}`)
      .join('\n');
    const texto = `📄 *Nueva Cotización Generada*\n\n👤 *Cliente:* ${cliente.nombre}\n🏢 *Empresa:* ${cliente.empresa || 'N/A'}\n\n📦 *Productos:*\n${listaProd}\n\n💰 *Total:* $${total.toLocaleString()}\n\n✅ _Stock actualizado automáticamente_`;

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

  const descargarPDF = (cliente: any, items: any[], total: number) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('COTIZACIÓN COMERCIAL', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.text(`Cliente: ${cliente.nombre}`, 14, 40);
      doc.text(`Empresa: ${cliente.empresa || 'Particular'}`, 14, 47);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 54);

      autoTable(doc, {
        startY: 65,
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

      doc.save(`Cotizacion_${cliente.nombre.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      alert(
        'No se pudo descargar el PDF automáticamente. Revisa los permisos de descarga.',
      );
    }
  };

  const procesarCotizacion = async () => {
    if (!clienteSeleccionado || carrito.length === 0)
      return alert('Faltan datos');
    setCargando(true);

    try {
      // 1. Restar Stock
      for (const item of carrito) {
        const nuevoStock = item.stock - item.cantidad;
        await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', item.id);
      }

      // 2. Guardar registro
      const total = calcularTotal();
      await supabase.from('cotizaciones').insert([
        {
          cliente_id: clienteSeleccionado.id,
          productos_seleccionados: carrito,
          total: total,
          estado: 'aprobado',
        },
      ]);

      // 3. Notificar y Descargar
      await enviarTelegram(clienteSeleccionado, total, carrito);
      descargarPDF(clienteSeleccionado, carrito, total);

      alert('¡Cotización exitosa! Stock restado y mensaje enviado.');
      setCarrito([]);
      setClienteSeleccionado(null);

      // Recargar inventario filtrado
      const { data: p } = await supabase
        .from('productos')
        .select('*')
        .gt('stock', 0);
      if (p) setProductosInventario(p);
    } catch (error) {
      console.error(error);
      alert('Error al procesar la operación');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* IZQUIERDA: SELECCIÓN */}
        <div className="flex-1 space-y-6">
          <section className="bg-white p-6 rounded-3xl shadow-sm border">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="text-blue-600" /> 1. Cliente
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
            <h2 className="text-xl font-bold mb-4">2. Productos disponibles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {productosInventario.map((p) => (
                <button
                  key={p.id}
                  onClick={() => agregarAlCarrito(p)}
                  className="p-4 rounded-2xl border bg-white hover:border-blue-400 hover:shadow-md text-left transition-all group"
                >
                  <p className="font-bold group-hover:text-blue-600 transition-colors">
                    {p.nombre}
                  </p>
                  <div className="flex justify-between mt-1 items-center">
                    <span className="text-blue-600 font-black">
                      ${p.precio}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-lg ${p.stock < 5 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}
                    >
                      Stock: {p.stock}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* DERECHA: CARRITO */}
        <div className="w-full lg:w-96">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-blue-50 sticky top-24">
            <h2 className="text-xl font-bold mb-6 border-b pb-4">Resumen</h2>

            <div className="space-y-4 max-h-[400px] overflow-y-auto mb-6 pr-2">
              {carrito.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 p-4 rounded-2xl space-y-3 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-bold text-slate-700">
                      {item.nombre}
                    </span>
                    <button
                      onClick={() => eliminarDelCarrito(item.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 bg-white rounded-xl border p-1 shadow-inner">
                      <button
                        onClick={() => ajustarCantidad(item.id, -1)}
                        className="p-1 hover:bg-slate-100 rounded-lg text-blue-600"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-black text-sm w-4 text-center">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => ajustarCantidad(item.id, 1)}
                        className="p-1 hover:bg-slate-100 rounded-lg text-blue-600"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <span className="font-black text-blue-600 text-lg">
                      ${(item.precio * item.cantidad).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              {carrito.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-slate-400 italic text-sm">
                    No has agregado productos
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-6">
                <span className="font-medium text-slate-500 uppercase text-xs tracking-widest">
                  Total a pagar
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
                className="w-full py-4 rounded-2xl font-black text-white bg-blue-600 shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:bg-slate-300 disabled:shadow-none"
              >
                {cargando ? 'PROCESANDO...' : 'APROBAR Y GENERAR'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
