'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function CotizarPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [productosInventario, setProductosInventario] = useState<any[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [carrito, setCarrito] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');

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
    setCarrito([...carrito, { ...prod, cantidad: 1 }]);
  };

  const calcularTotal = () =>
    carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  const finalizarCotizacion = async () => {
    if (!clienteSeleccionado || carrito.length === 0)
      return alert('Selecciona cliente y productos');

    const { error } = await supabase.from('cotizaciones').insert([
      {
        cliente_id: clienteSeleccionado,
        productos_seleccionados: carrito,
        total: calcularTotal(),
        estado: 'pendiente',
      },
    ]);

    if (!error) {
      setMensaje('✅ Cotización guardada con éxito');
      setCarrito([]);
      setClienteSeleccionado('');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* COLUMNA IZQUIERDA: SELECCIÓN */}
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4 font-sans">
              1. Seleccionar Cliente
            </h2>
            <select
              className="w-full p-3 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500"
              value={clienteSeleccionado}
              onChange={(e) => setClienteSeleccionado(e.target.value)}
            >
              <option value="">-- Elige un cliente --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.empresa})
                </option>
              ))}
            </select>
          </section>

          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4 font-sans">
              2. Agregar Productos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {productosInventario.map((p) => (
                <button
                  key={p.id}
                  onClick={() => agregarAlCarrito(p)}
                  className="text-left p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200 group"
                >
                  <p className="font-bold group-hover:text-blue-700">
                    {p.nombre}
                  </p>
                  <p className="text-sm text-slate-500">
                    ${p.precio} | Stock: {p.stock}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* COLUMNA DERECHA: RESUMEN */}
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-3xl shadow-lg border border-blue-100 sticky top-24">
            <h2 className="text-xl font-bold mb-4">Resumen</h2>
            <div className="space-y-4 mb-6">
              {carrito.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between text-sm border-b pb-2"
                >
                  <span>{item.nombre}</span>
                  <span className="font-bold">${item.precio}</span>
                </div>
              ))}
              {carrito.length === 0 && (
                <p className="text-slate-400 text-sm italic">
                  No hay productos...
                </p>
              )}
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-6">
                <span className="text-slate-500">Total:</span>
                <span className="text-2xl font-black text-blue-600">
                  ${calcularTotal()}
                </span>
              </div>
              <button
                onClick={finalizarCotizacion}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-blue-200 shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
              >
                Generar Cotización
              </button>
            </div>
            {mensaje && (
              <p className="mt-4 text-center text-green-600 font-bold animate-pulse">
                {mensaje}
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
