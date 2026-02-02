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
} from 'lucide-react';

export default function CotizarPage() {
  // ... (Estados se mantienen igual)
  const [clientes, setClientes] = useState<any[]>([]);
  const [productosInventario, setProductosInventario] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
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

  // --- LÓGICA DE PDF PROFESIONAL ---
  const descargarPDF = (cliente: any, items: any[], total: number) => {
    try {
      const doc = new jsPDF();
      const colorPrincipal = [37, 99, 235]; // Azul profesional

      // 1. Membrete / Encabezado
      doc.setFillColor(248, 250, 252); // Fondo gris muy claro
      doc.rect(0, 0, 210, 40, 'F');

      // Logo (Simulado con texto, puedes usar doc.addImage si tienes la URL en base64)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(37, 99, 235);
      doc.text('MI EMPRESA S.A.', 14, 25);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text('Nit: 123.456.789-0', 14, 32);
      doc.text('Dirección: Calle Principal #123', 14, 37);

      // 2. Título y Fecha (Derecha)
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text('COTIZACIÓN', 196, 25, { align: 'right' });
      doc.setFontSize(10);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 196, 32, {
        align: 'right',
      });

      // 3. Información del Cliente (Caja)
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 50, 182, 25, 3, 3);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENTE:', 20, 58);
      doc.setFont('helvetica', 'normal');
      doc.text(`${cliente.nombre}`, 45, 58);
      doc.setFont('helvetica', 'bold');
      doc.text('EMPRESA:', 20, 65);
      doc.setFont('helvetica', 'normal');
      doc.text(`${cliente.empresa || 'Particular'}`, 45, 65);

      // 4. Tabla de Productos

      autoTable(doc, {
        startY: 85,
        head: [['Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
        body: items.map((i) => [
          i.nombre,
          i.cantidad,
          `$${i.precio.toLocaleString()}`,
          `$${(i.precio * i.cantidad).toLocaleString()}`,
        ]),
        theme: 'striped',

        headStyles: {
          fillColor: [37, 99, 235] as [number, number, number],
          fontSize: 11,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
        styles: { fontSize: 10, cellPadding: 5 },
      });

      // 5. Total Final
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL COTIZADO:', 140, finalY);
      doc.setFontSize(16);
      doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
      doc.text(`$${total.toLocaleString()}`, 196, finalY, { align: 'right' });

      // 6. Pie de página
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Gracias por su preferencia. Esta cotización tiene una validez de 15 días.',
        105,
        285,
        { align: 'center' },
      );

      doc.save(`Cotizacion_${cliente.nombre}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error al generar PDF profesional');
    }
  };

  // ... (Funciones auxiliares se mantienen igual)
  const calcularTotal = () =>
    carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
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
          total: total,
          estado: 'pendiente',
        },
      ]);
      if (error) throw error;
      descargarPDF(clienteSeleccionado, carrito, total);
      setCarrito([]);
      setClienteSeleccionado(null);
      alert('Cotización generada con éxito');
    } catch (e) {
      alert('Error al procesar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 pb-32">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* COLUMNA IZQUIERDA: SELECCIÓN */}
        <div className="flex-1 space-y-6">
          <header className="mb-4">
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">
              Nueva Cotización
            </h1>
          </header>

          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-blue-100 rounded-xl">
                <FileText className="text-blue-600" size={24} />
              </div>
              1. Cliente
            </h2>
            <select
              className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none ring-2 ring-slate-100 focus:ring-4 focus:ring-blue-500/20 text-xl font-bold outline-none transition-all appearance-none"
              onChange={(e) =>
                setClienteSeleccionado(
                  clientes.find((c) => c.id === e.target.value),
                )
              }
              value={clienteSeleccionado?.id || ''}
            >
              <option value="">-- Seleccionar --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.empresa ? `(${c.empresa})` : ''}
                </option>
              ))}
            </select>
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex flex-col gap-6 mb-8">
              <h2 className="text-2xl font-black text-slate-800">
                2. Selección de Productos
              </h2>
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={24}
                />
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  className="w-full pl-14 pr-4 py-5 bg-slate-50 rounded-[1.5rem] outline-none ring-2 ring-slate-100 focus:ring-4 focus:ring-blue-500/20 text-xl font-medium"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[600px] overflow-y-auto pr-2">
              {productosInventario
                .filter((p) =>
                  p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
                )
                .map((p) => {
                  const enCarrito = carrito.find((item) => item.id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => agregarAlCarrito(p)}
                      className={`p-6 rounded-[2rem] border-2 text-left transition-all relative ${
                        enCarrito
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-100 bg-white'
                      }`}
                    >
                      {enCarrito && (
                        <div className="absolute -top-3 -right-3 bg-blue-600 text-white font-black w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-lg">
                          {enCarrito.cantidad}
                        </div>
                      )}
                      <p className="font-black text-xl text-slate-800 mb-2 leading-tight">
                        {p.nombre}
                      </p>
                      <div className="flex justify-between items-end">
                        <span className="text-2xl font-black text-blue-600">
                          ${p.precio}
                        </span>
                        <span className="text-xs font-bold px-3 py-1 bg-slate-200 text-slate-600 rounded-full uppercase">
                          Stock: {p.stock}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </section>
        </div>

        {/* RESUMEN - Lado derecho / Letras grandes */}
        <div className="w-full lg:w-[480px]">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-blue-50 lg:sticky lg:top-8">
            <h2 className="text-2xl font-black mb-8 border-b pb-4 text-slate-800 flex items-center justify-between">
              Resumen <ShoppingCart size={24} className="text-blue-500" />
            </h2>

            <div className="space-y-4 max-h-[500px] overflow-y-auto mb-8 pr-2">
              {carrito.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 relative group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-lg font-black text-slate-700 leading-tight flex-1 pr-4">
                      {item.nombre}
                    </span>
                    <button
                      onClick={() =>
                        setCarrito(carrito.filter((i) => i.id !== item.id))
                      }
                      className="text-red-400 p-2"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center bg-white rounded-2xl p-1 shadow-sm ring-1 ring-slate-200">
                      <button
                        onClick={() =>
                          setCarrito(
                            carrito.map((i) =>
                              i.id === item.id && i.cantidad > 1
                                ? { ...i, cantidad: i.cantidad - 1 }
                                : i,
                            ),
                          )
                        }
                        className="p-3 text-blue-600"
                      >
                        <Minus size={20} />
                      </button>
                      <span className="w-12 text-center text-xl font-black">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() =>
                          setCarrito(
                            carrito.map((i) =>
                              i.id === item.id && i.cantidad < i.stock
                                ? { ...i, cantidad: i.cantidad + 1 }
                                : i,
                            ),
                          )
                        }
                        className="p-3 text-blue-600"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Subtotal
                      </p>
                      <p className="text-2xl font-black text-blue-600">
                        ${(item.precio * item.cantidad).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t-4 border-dashed border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <span className="text-sm font-black text-slate-400 uppercase tracking-widest">
                  Total Cotizado
                </span>
                <span className="text-5xl font-black text-blue-700">
                  ${calcularTotal().toLocaleString()}
                </span>
              </div>

              <button
                onClick={procesarCotizacion}
                disabled={
                  cargando || carrito.length === 0 || !clienteSeleccionado
                }
                className="w-full py-6 rounded-[2rem] font-black text-2xl text-white bg-blue-600 shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:bg-slate-300 disabled:shadow-none"
              >
                {cargando ? 'PROCESANDO...' : 'GENERAR Y BAJAR PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
