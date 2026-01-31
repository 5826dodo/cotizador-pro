'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function InventarioPage() {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [editando, setEditando] = useState<any>(null); // Para el producto a editar

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
      setMensaje(editando ? '¡Actualizado!' : '¡Guardado!');
      if (!editando) await enviarTelegram(nombre, precio, stock);
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
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* SECCIÓN FORMULARIO - ADAPTABLE */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            {editando ? '📝 Editando Producto' : '➕ Agregar Producto'}
          </h2>
          <form
            onSubmit={guardarProducto}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <input
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <input
              placeholder="Precio"
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <input
              placeholder="Stock"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <div className="flex gap-2">
              <button
                className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${editando ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {editando ? 'Actualizar' : 'Guardar'}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="bg-slate-200 p-3 rounded-xl hover:bg-slate-300"
                >
                  ✖
                </button>
              )}
            </div>
          </form>
          {mensaje && (
            <p className="mt-4 text-center text-green-600 font-medium bg-green-50 py-2 rounded-lg">
              {mensaje}
            </p>
          )}
        </section>

        {/* SECCIÓN LISTADO RESPONSIVE */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-6">Inventario Actual</h2>

          {/* Vista para PC (Tablas) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-slate-400 uppercase text-xs tracking-wider">
                  <th className="pb-4">Producto</th>
                  <th className="pb-4">Precio</th>
                  <th className="pb-4">Stock</th>
                  <th className="pb-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productos.map((prod) => (
                  <tr
                    key={prod.id}
                    className="group hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-4 font-medium">{prod.nombre}</td>
                    <td className="py-4 text-blue-600 font-semibold">
                      ${prod.precio}
                    </td>
                    <td className="py-4">{prod.stock}</td>
                    <td className="py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => prepararEdicion(prod)}
                        className="p-2 hover:bg-orange-100 text-orange-600 rounded-lg"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => eliminarProducto(prod.id)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista para Móvil (Tarjetas) */}
          <div className="md:hidden space-y-4">
            {productos.map((prod) => (
              <div
                key={prod.id}
                className="border border-slate-100 p-4 rounded-xl flex justify-between items-center shadow-sm"
              >
                <div>
                  <h3 className="font-bold">{prod.nombre}</h3>
                  <p className="text-blue-600 font-bold">
                    ${prod.precio}{' '}
                    <span className="text-slate-400 font-normal text-sm ml-2">
                      Stock: {prod.stock}
                    </span>
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => prepararEdicion(prod)}
                    className="p-2 bg-orange-50 text-orange-600 rounded-lg"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => eliminarProducto(prod.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg"
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
