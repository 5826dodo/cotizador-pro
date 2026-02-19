'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Package } from 'lucide-react';

export default function InventarioPage() {
  const supabase = createClient();
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [editando, setEditando] = useState<any>(null);

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const obtenerProductos = async (idEmpresa: string) => {
    const { data } = await supabase
      .from('productos')
      .select('*')
      .eq('empresa_id', idEmpresa)
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
      empresa_id: empresaId,
    };

    let error;
    if (editando) {
      const { error: err } = await supabase
        .from('productos')
        .update(payload)
        .eq('id', editando.id)
        .eq('empresa_id', empresaId);
      error = err;
    } else {
      const { error: err } = await supabase.from('productos').insert([payload]);
      error = err;
    }

    if (!error) {
      setMensaje(editando ? '✅ Actualizado' : '🚀 Guardado');
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
        .eq('empresa_id', empresaId);
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

  if (cargando)
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          {/* Círculo de fondo animado */}
          <div className="absolute w-16 h-16 border-4 border-ventiq-orange/20 rounded-full"></div>
          {/* Spinner principal */}
          <Loader2 className="w-16 h-16 text-ventiq-orange animate-spin stroke-[1.5]" />
          {/* Icono central estático opcional */}
          <Package className="absolute w-6 h-6 text-ventiq-black" />
        </div>

        <div className="mt-6 text-center">
          <h3 className="text-ventiq-black font-black uppercase tracking-tighter text-lg">
            Ventiq <span className="text-ventiq-orange">Almacén</span>
          </h3>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">
            Sincronizando inventario...
          </p>
        </div>

        {/* Decoración de fondo: Esqueletos de tabla falsos para dar sensación de carga */}
        <div className="mt-12 w-full max-w-2xl opacity-20 hidden md:block">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 bg-slate-200 rounded-2xl mb-3 w-full animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );

  return (
    <main className="min-h-screen bg-slate-100 text-ventiq-black">
      <div className="max-w-5xl mx-auto p-2 md:p-8 space-y-4 md:space-y-8">
        <div className="px-2 pt-2">
          {/* TÍTULO USANDO VARIABLES */}
          <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter">
            Mi Inventario <span className="text-ventiq-orange">Ventiq</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            ID: {empresaId?.split('-')[0]}...
          </p>
        </div>

        {/* FORMULARIO */}
        <section className="bg-white p-4 md:p-6 rounded-3xl shadow-lg border border-white">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            {editando ? '✏️ Editando Producto' : '➕ Nuevo Registro'}
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
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-2xl focus:border-ventiq-orange focus:bg-white transition-all outline-none font-bold"
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
                className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-2xl focus:border-ventiq-orange focus:bg-white transition-all outline-none font-bold"
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
                className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-2xl focus:border-ventiq-orange focus:bg-white transition-all outline-none font-bold"
                required
              />
            </div>

            <div className="flex gap-2 pt-1 md:pt-5">
              {/* BOTÓN DINÁMICO (Cambia de color si edita o guarda usando tus variables) */}
              <button
                className={`flex-1 py-3 md:py-0 rounded-2xl font-bold text-white shadow-md active:scale-95 transition-all ${
                  editando
                    ? 'bg-ventiq-orange'
                    : 'bg-ventiq-black hover:bg-slate-800'
                }`}
              >
                {editando ? 'Actualizar' : 'Guardar'}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="bg-slate-200 p-3 rounded-2xl hover:bg-slate-300 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          {mensaje && (
            <div className="mt-3 p-2 bg-orange-50 text-ventiq-orange text-center rounded-xl font-bold text-sm border border-orange-100 animate-pulse">
              {mensaje}
            </div>
          )}
        </section>

        {/* LISTADO ESCRITORIO */}
        <section className="space-y-3">
          <div className="hidden md:block bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-slate-400 text-xs uppercase font-black">
                  <th className="p-5">Producto</th>
                  <th className="p-5">Precio</th>
                  <th className="p-5">Stock</th>
                  <th className="p-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productos.map((prod) => (
                  <tr
                    key={prod.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-5 font-bold uppercase text-sm tracking-tight">
                      {prod.nombre}
                    </td>
                    <td className="p-5 text-ventiq-orange font-black">
                      ${prod.precio.toFixed(2)}
                    </td>
                    <td className="p-5">
                      <span
                        className={`px-3 py-1 rounded-lg font-bold text-xs ${prod.stock < 5 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {prod.stock} UNIDADES
                      </span>
                    </td>
                    <td className="p-5 text-right space-x-2">
                      <button
                        onClick={() => prepararEdicion(prod)}
                        className="p-2 text-ventiq-orange hover:bg-orange-50 rounded-xl transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => eliminarProducto(prod.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
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
                className="bg-white p-4 rounded-3xl shadow-md flex justify-between items-center border border-white"
              >
                <div className="flex-1">
                  <h3 className="font-bold text-ventiq-black uppercase text-sm">
                    {prod.nombre}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-ventiq-orange font-black text-lg">
                      ${prod.precio}
                    </span>
                    <span className="text-slate-400 text-[10px] font-black bg-slate-100 px-2 py-1 rounded-lg">
                      STOCK: {prod.stock}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => prepararEdicion(prod)}
                    className="w-10 h-10 flex items-center justify-center bg-orange-50 text-ventiq-orange rounded-xl border border-orange-100"
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
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
                El almacén está vacío
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
