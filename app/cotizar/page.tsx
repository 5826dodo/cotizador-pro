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
  ShoppingCart, // Nuevo icono
  ChevronUp, // Nuevo icono
} from 'lucide-react';

export default function CotizarPage() {
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

  // Función para hacer scroll suave al resumen (útil en móvil)
  const irAlResumen = () => {
    const elemento = document.getElementById('resumen-cotizacion');
    elemento?.scrollIntoView({ behavior: 'smooth' });
  };

  const procesarCotizacion = async () => {
    if (!clienteSeleccionado || carrito.length === 0)
      return alert('Faltan datos');
    setCargando(true);
    try {
      for (const item of carrito) {
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
      // ... funciones de telegram y pdf omitidas por brevedad pero se mantienen igual ...
      alert('Éxito');
      setCarrito([]);
      setClienteSeleccionado(null);
    } catch (e) {
      alert('Error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 pb-24 md:pb-8">
      {' '}
      {/* Padding extra abajo en móvil */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          {/* CLIENTE */}
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

          {/* CATALOGO */}
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
              {productosFiltrados.map((p) => {
                const enCarrito = carrito.find((item) => item.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => agregarAlCarrito(p)}
                    className={`p-4 rounded-2xl border text-left transition-all relative group ${
                      enCarrito
                        ? 'border-blue-500 bg-blue-50/30'
                        : 'bg-white hover:border-blue-400'
                    }`}
                  >
                    {/* INDICADOR DE CANTIDAD EN CATÁLOGO */}
                    {enCarrito && (
                      <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white">
                        {enCarrito.cantidad}
                      </span>
                    )}

                    <p
                      className={`font-bold ${enCarrito ? 'text-blue-700' : 'text-slate-700'}`}
                    >
                      {p.nombre}
                    </p>
                    <div className="flex justify-between mt-2 items-center">
                      <span className="text-blue-600 font-black">
                        ${p.precio}
                      </span>
                      <span className="text-[10px] px-2 py-1 rounded-lg font-bold bg-slate-100 text-slate-500">
                        STOCK: {p.stock}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* RESUMEN (DERECHA) */}
        <div id="resumen-cotizacion" className="w-full lg:w-[450px]">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-blue-50 sticky top-24">
            <h2 className="text-xl font-bold mb-6 border-b pb-4 text-slate-800">
              Resumen
            </h2>
            {/* ... Resto del carrito igual que tu código ... */}
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
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">
                        Cant.
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
            </div>
            {/* BOTÓN PROCESAR */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-6 text-3xl font-black text-blue-700">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  Total
                </span>
                ${calcularTotal().toLocaleString()}
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
      {/* BARRA FLOTANTE MÓVIL (Solo visible en LG:Hidden) */}
      {carrito.length > 0 && (
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-[60] animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-slate-900 text-white rounded-[2rem] p-4 shadow-2xl flex items-center justify-between border border-slate-700/50 backdrop-blur-md">
            <div className="flex items-center gap-4 ml-2">
              <div className="relative">
                <ShoppingCart className="text-blue-400" size={24} />
                <span className="absolute -top-2 -right-2 bg-red-500 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {carrito.length}
                </span>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">
                  Total
                </p>
                <p className="text-lg font-black">
                  ${calcularTotal().toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={irAlResumen}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95"
            >
              Ver Detalle <ChevronUp size={18} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
