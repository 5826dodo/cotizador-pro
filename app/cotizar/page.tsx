'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CotizarPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [productosInventario, setProductosInventario] = useState<any[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: c } = await supabase.from('clientes').select('*');
      const { data: p } = await supabase.from('productos').select('*');
      if (c) setClientes(c);
      if (p) setProductosInventario(p);
    };
    cargarDatos();
  }, []);

  const agregarAlCarrito = (prod: any) => {
    const existe = carrito.find((item) => item.id === prod.id);
    if (existe) {
      setCarrito(
        carrito.map((item) =>
          item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item,
        ),
      );
    } else {
      setCarrito([...carrito, { ...prod, cantidad: 1 }]);
    }
  };

  const calcularTotal = () =>
    carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  const enviarTelegram = async (cliente: any, total: number, items: any[]) => {
    const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;
    const listaProd = items
      .map((i) => `- ${i.nombre} (x${i.cantidad})`)
      .join('\n');
    const texto = `📄 *Nueva Cotización Generada*\n\n👤 *Cliente:* ${cliente.nombre}\n🏢 *Empresa:* ${cliente.empresa || 'N/A'}\n\n📦 *Productos:*\n${listaProd}\n\n💰 *Total:* $${total.toLocaleString()}\n\n✅ _Cotización lista para revisión_`;

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
  };

  const procesarCotizacion = async () => {
    if (!clienteSeleccionado || carrito.length === 0)
      return alert('Faltan datos');
    setCargando(true);

    try {
      // 1. Restar Stock en la base de datos
      for (const item of carrito) {
        const nuevoStock = item.stock - item.cantidad;
        if (nuevoStock < 0) {
          alert(`No hay suficiente stock de ${item.nombre}`);
          setCargando(false);
          return;
        }
        await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', item.id);
      }

      // 2. Guardar registro de cotización
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

      alert('¡Cotización procesada, stock actualizado y PDF generado!');
      setCarrito([]);
      setClienteSeleccionado(null);
      // Recargar inventario para ver el stock actualizado
      const { data: p } = await supabase.from('productos').select('*');
      if (p) setProductosInventario(p);
    } catch (error) {
      console.error(error);
      alert('Error al procesar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* PANEL DE SELECCIÓN */}
        <div className="flex-1 space-y-6">
          <section className="bg-white p-6 rounded-3xl shadow-sm border">
            <h2 className="text-xl font-bold mb-4">1. Datos del Cliente</h2>
            <select
              className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500"
              onChange={(e) =>
                setClienteSeleccionado(
                  clientes.find((c) => c.id === e.target.value),
                )
              }
            >
              <option value="">-- Seleccionar Cliente --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} | {c.empresa}
                </option>
              ))}
            </select>
          </section>

          <section className="bg-white p-6 rounded-3xl shadow-sm border">
            <h2 className="text-xl font-bold mb-4">2. Agregar Productos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {productosInventario.map((p) => (
                <button
                  key={p.id}
                  onClick={() => agregarAlCarrito(p)}
                  disabled={p.stock <= 0}
                  className={`p-4 rounded-2xl border text-left transition-all ${p.stock <= 0 ? 'bg-slate-100 opacity-50 cursor-not-allowed' : 'bg-white hover:border-blue-400 hover:shadow-md'}`}
                >
                  <p className="font-bold">{p.nombre}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-blue-600 font-bold">${p.precio}</span>
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

        {/* RESUMEN Y ACCIÓN */}
        <div className="w-full lg:w-96">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-blue-50 sticky top-24">
            <h2 className="text-xl font-bold mb-6 border-b pb-4">
              Orden de Venta
            </h2>
            <div className="space-y-4 max-h-60 overflow-y-auto mb-6">
              {carrito.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-slate-50 p-3 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-bold">{item.nombre}</p>
                    <p className="text-xs text-slate-400">
                      Cant: {item.cantidad} x ${item.precio}
                    </p>
                  </div>
                  <p className="font-bold text-blue-600">
                    ${item.precio * item.cantidad}
                  </p>
                </div>
              ))}
              {carrito.length === 0 && (
                <p className="text-center py-10 text-slate-400 italic">
                  Carrito vacío
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium">Total:</span>
                <span className="text-3xl font-black text-blue-600">
                  ${calcularTotal()}
                </span>
              </div>

              <button
                onClick={procesarCotizacion}
                disabled={
                  cargando || carrito.length === 0 || !clienteSeleccionado
                }
                className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${cargando ? 'bg-slate-400' : 'bg-blue-600 shadow-blue-200'}`}
              >
                {cargando ? 'Procesando...' : 'APROBAR Y GENERAR PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
