'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function InventarioPage() {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [editando, setEditando] = useState<any>(null);

  const obtenerProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProductos(data);
  };

  useEffect(() => {
    obtenerProductos();
  }, []);

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nombre,
      precio: parseFloat(precio),
      stock: parseInt(stock),
    };

    let error;
    if (editando) {
      const { error: err } = await supabase
        .from('productos')
        .update(payload)
        .eq('id', editando.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('productos').insert([payload]);
      error = err;
    }

    if (!error) {
      setMensaje(editando ? '✅ Actualizado' : '🚀 Guardado');
      if (!editando) await enviarTelegram(nombre, precio, stock);

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMensaje(''), 3000);

      cancelarEdicion();
      obtenerProductos();
    }
  };

  const eliminarProducto = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (!error) obtenerProductos();
    }
  };

  const prepararEdicion = (prod: any) => {
    setEditando(prod);
    setNombre(prod.nombre);
    setPrecio(prod.precio.toString());
    setStock(prod.stock.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setNombre('');
    setPrecio('');
    setStock('');
  };

  const enviarTelegram = async (n: string, p: string, s: string) => {
    try {
      const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
      const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;
      const texto = `📦 *Nuevo Producto*\n\n🔹 *Nombre:* ${n}\n💰 *Precio:* $${p}\n🔢 *Stock:* ${s}`;
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

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* Contenedor principal: p-2 en móvil para aprovechar espacio, p-8 en PC */}
      <div className="max-w-5xl mx-auto p-2 md:p-8 space-y-4 md:space-y-8">
        {/* ENCABEZADO */}
        <div className="px-2 pt-2 md:pt-0">
          <h1 className="text-xl md:text-3xl font-black text-blue-600 uppercase tracking-tighter">
            Cotizador Pro
          </h1>
        </div>

        {/* SECCIÓN FORMULARIO */}
        <section className="bg-white p-4 md:p-6 rounded-3xl shadow-lg border border-white">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            {editando ? '✏️ Editando' : '➕ Nuevo Producto'}
          </h2>

          {/* Inputs en columna para móvil, en fila para PC */}
          <form
            onSubmit={guardarProducto}
            className="flex flex-col md:grid md:grid-cols-4 gap-3"
          >
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">
                Producto
              </label>
              <input
                placeholder="Nombre del producto"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none text-base"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">
                Precio ($)
              </label>
              <input
                placeholder="0.00"
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none text-base"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">
                Cantidad
              </label>
              <input
                placeholder="0"
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none text-base"
                required
              />
            </div>

            <div className="flex gap-2 pt-1 md:pt-5">
              <button
                className={`flex-1 py-3 md:py-0 rounded-2xl font-bold text-white shadow-md active:scale-95 transition-transform ${editando ? 'bg-orange-500' : 'bg-blue-600'}`}
              >
                {editando ? 'Actualizar' : 'Guardar'}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="bg-slate-200 p-3 rounded-2xl"
                >
                  ✕
                </button>
              )}
            </div>
          </form>
          {mensaje && (
            <div className="mt-3 p-2 bg-blue-50 text-blue-600 text-center rounded-xl font-bold text-sm">
              {mensaje}
            </div>
          )}
        </section>

        {/* SECCIÓN LISTADO */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold px-2">Inventario</h2>

          {/* TABLE PC */}
          <div className="hidden md:block bg-white rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-slate-400 text-xs uppercase">
                  <th className="p-4">Producto</th>
                  <th className="p-4">Precio</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productos.map((prod) => (
                  <tr
                    key={prod.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 font-bold">{prod.nombre}</td>
                    <td className="p-4 text-blue-600 font-bold">
                      ${prod.precio}
                    </td>
                    <td className="p-4">{prod.stock}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => prepararEdicion(prod)}
                        className="p-2 text-orange-500"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => eliminarProducto(prod.id)}
                        className="p-2 text-red-500"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CARDS MÓVIL (MUCHO MÁS GRANDES) */}
          <div className="md:hidden flex flex-col gap-3">
            {productos.map((prod) => (
              <div
                key={prod.id}
                className="bg-white p-4 rounded-3xl shadow-md border border-white flex justify-between items-center"
              >
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-base leading-tight uppercase">
                    {prod.nombre}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-blue-600 font-black text-lg">
                      ${prod.precio}
                    </span>
                    <span className="text-slate-400 text-xs font-bold bg-slate-100 px-2 py-1 rounded-lg">
                      Stock: {prod.stock}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => prepararEdicion(prod)}
                    className="w-12 h-12 flex items-center justify-center bg-orange-50 text-orange-600 rounded-2xl border border-orange-100 text-xl"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => eliminarProducto(prod.id)}
                    className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-600 rounded-2xl border border-red-100 text-xl"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
