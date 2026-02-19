'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Package, Plus, Trash2, Pencil, X, CheckCircle2 } from 'lucide-react';

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
    const { data, error } = await supabase
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
      setMensaje(editando ? 'Actualizado correctamente' : 'Producto guardado');
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

  const enviarTelegram = async (n: string, p: string, s: string) => {
    try {
      const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
      const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;
      const texto = `📦 *Ventiq Alerta: Nuevo Producto*\n\n🔹 *Nombre:* ${n}\n💰 *Precio:* $${p}\n🔢 *Stock:* ${s}`;
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF9800]"></div>
        <p className="mt-4 font-black text-[#1A1D23] uppercase tracking-widest text-xs">
          Cargando Almacén...
        </p>
      </div>
    );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-10">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* Cabecera de Página */}
        <div className="flex justify-between items-end border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-3xl font-black text-[#1A1D23] tracking-tighter flex items-center gap-2">
              <Package className="text-[#FF9800]" size={32} />
              MI INVENTARIO
            </h1>
            <p className="text-[#FF9800] text-[10px] font-bold tracking-[0.2em] uppercase">
              Ventiq / Gestión de Stock
            </p>
          </div>
          <p className="hidden md:block text-slate-400 text-[10px] font-bold">
            EMPRESA: {empresaId?.split('-')[0]}
          </p>
        </div>

        {/* Formulario Estilo Ventiq */}
        <section className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <h2 className="text-sm font-black mb-6 uppercase tracking-widest text-slate-400 flex items-center gap-2">
            {editando ? (
              <Pencil size={16} className="text-[#FF9800]" />
            ) : (
              <Plus size={16} className="text-[#FF9800]" />
            )}
            {editando ? 'Editar Producto' : 'Añadir Nuevo Ítem'}
          </h2>

          <form
            onSubmit={guardarProducto}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-[10px] uppercase font-black text-slate-500 ml-1">
                Nombre
              </label>
              <input
                placeholder="Ej. Cámara Sony"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-2xl focus:border-[#FF9800] focus:bg-white transition-all outline-none font-bold text-sm"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-black text-slate-500 ml-1">
                Precio ($)
              </label>
              <input
                placeholder="0.00"
                type="number"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-2xl focus:border-[#FF9800] focus:bg-white transition-all outline-none font-bold text-sm"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-black text-slate-500 ml-1">
                Stock Actual
              </label>
              <input
                placeholder="0"
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-2xl focus:border-[#FF9800] focus:bg-white transition-all outline-none font-bold text-sm"
                required
              />
            </div>

            <div className="flex gap-2 items-end">
              <button
                type="submit"
                className="flex-1 h-[48px] rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-[#1A1D23] hover:bg-[#FF9800] transition-all shadow-lg active:scale-95"
              >
                {editando ? 'Actualizar' : 'Guardar'}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="h-[48px] w-[48px] flex items-center justify-center bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </form>

          {mensaje && (
            <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-orange-50 text-[#FF9800] rounded-2xl font-black text-xs uppercase tracking-widest border border-orange-100 animate-pulse">
              <CheckCircle2 size={16} /> {mensaje}
            </div>
          )}
        </section>

        {/* Tabla / Lista de Productos */}
        <section className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Producto
                  </th>
                  <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Precio Unitario
                  </th>
                  <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Stock
                  </th>
                  <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {productos.map((prod) => (
                  <tr
                    key={prod.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="p-5">
                      <p className="font-black text-[#1A1D23] text-sm uppercase">
                        {prod.nombre}
                      </p>
                    </td>
                    <td className="p-5 font-black text-[#FF9800] text-sm">
                      ${prod.precio.toFixed(2)}
                    </td>
                    <td className="p-5">
                      <span
                        className={`px-3 py-1 rounded-full font-black text-[10px] ${prod.stock <= 5 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {prod.stock} UNIDADES
                      </span>
                    </td>
                    <td className="p-5 text-right flex justify-end gap-2">
                      <button
                        onClick={() => prepararEdicion(prod)}
                        className="p-2 text-slate-400 hover:text-[#FF9800] hover:bg-orange-50 rounded-xl transition-all"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => eliminarProducto(prod.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {productos.length === 0 && (
            <div className="p-20 text-center">
              <Package size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
                Inventario Vacío
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
