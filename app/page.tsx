'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'; // Asegúrate de usar tu cliente configurado

export default function InventarioPage() {
  const supabase = createClient();
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [editando, setEditando] = useState<any>(null);

  // --- ESTADOS PARA SaaS ---
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const obtenerProductos = async (idEmpresa: string) => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('empresa_id', idEmpresa) // FILTRO CRÍTICO
      .order('created_at', { ascending: false });
    if (data) setProductos(data);
  };

  useEffect(() => {
    const inicializarDatos = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('empresa_id')
          .eq('id', user.id)
          .single();

        if (perfil?.empresa_id) {
          setEmpresaId(perfil.empresa_id);
          await obtenerProductos(perfil.empresa_id);
        }
      }
      setCargando(false);
    };
    inicializarDatos();
  }, []);

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return alert('Error: No se identificó tu empresa.');

    const payload = {
      nombre,
      precio: parseFloat(precio),
      stock: parseInt(stock),
      empresa_id: empresaId, // ASIGNACIÓN DE DUEÑO
    };

    let error;
    if (editando) {
      const { error: err } = await supabase
        .from('productos')
        .update(payload)
        .eq('id', editando.id)
        .eq('empresa_id', empresaId); // SEGURIDAD EXTRA
      error = err;
    } else {
      const { error: err } = await supabase.from('productos').insert([payload]);
      error = err;
    }

    if (!error) {
      setMensaje(editando ? '✅ Actualizado' : '🚀 Guardado');
      if (!editando) await enviarTelegram(nombre, precio, stock);

      setTimeout(() => setMensaje(''), 3000);
      cancelarEdicion();
      obtenerProductos(empresaId);
    }
  };

  const eliminarProducto = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresaId); // SEGURIDAD: Solo puede borrar los suyos
      if (!error) obtenerProductos(empresaId!);
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
    // Tu lógica de telegram se mantiene igual...
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

  if (cargando)
    return (
      <div className="p-10 text-center font-bold">Cargando almacén...</div>
    );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="max-w-5xl mx-auto p-2 md:p-8 space-y-4 md:space-y-8">
        <div className="px-2 pt-2">
          <h1 className="text-xl md:text-3xl font-black text-blue-600 uppercase tracking-tighter">
            Mi Inventario
          </h1>
          <p className="text-slate-500 text-xs font-bold">
            EMPRESA ID: {empresaId?.split('-')[0]}...
          </p>
        </div>

        {/* FORMULARIO */}
        <section className="bg-white p-4 md:p-6 rounded-3xl shadow-lg border border-white">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            {editando ? '✏️ Editando' : '➕ Nuevo Producto'}
          </h2>

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
                className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none"
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
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">
                Stock
              </label>
              <input
                placeholder="0"
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none"
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

        {/* LISTADO */}
        <section className="space-y-3">
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
                    <td className="p-4 font-bold uppercase text-sm">
                      {prod.nombre}
                    </td>
                    <td className="p-4 text-blue-600 font-black">
                      ${prod.precio}
                    </td>
                    <td className="p-4 font-bold text-slate-500">
                      {prod.stock}
                    </td>
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

          {/* CARDS MÓVIL */}
          <div className="md:hidden flex flex-col gap-3">
            {productos.map((prod) => (
              <div
                key={prod.id}
                className="bg-white p-4 rounded-3xl shadow-md flex justify-between items-center"
              >
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 uppercase text-sm">
                    {prod.nombre}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-blue-600 font-black text-lg">
                      ${prod.precio}
                    </span>
                    <span className="text-slate-400 text-xs font-bold bg-slate-100 px-2 py-1 rounded-lg">
                      S: {prod.stock}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => prepararEdicion(prod)}
                    className="w-10 h-10 flex items-center justify-center bg-orange-50 text-orange-600 rounded-xl border border-orange-100"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => eliminarProducto(prod.id)}
                    className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-xl border border-red-100"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
          {productos.length === 0 && (
            <p className="text-center py-10 text-slate-400 font-bold">
              No hay productos en tu inventario.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
