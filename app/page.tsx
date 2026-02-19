'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Package,
  Plus,
  Trash2,
  Pencil,
  X,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

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
    if (!empresaId) return alert('Error de autenticación.');

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
        .eq('id', editando.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('productos').insert([payload]);
      error = err;
    }

    if (!error) {
      setMensaje(editando ? 'Actualizado' : 'Guardado');
      setTimeout(() => setMensaje(''), 3000);
      cancelarEdicion();
      obtenerProductos(empresaId);
    }
  };

  const eliminarProducto = async (id: string) => {
    if (confirm('¿Eliminar producto?')) {
      await supabase.from('productos').delete().eq('id', id);
      obtenerProductos(empresaId!);
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="animate-spin text-[#FF9800]" size={40} />
      </div>
    );

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#1A1D23] pb-20">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* HEADER PERSONALIZADO */}
        <div className="flex flex-col gap-1 border-l-4 border-[#FF9800] pl-4">
          <h1 className="text-3xl font-black tracking-tighter uppercase">
            Inventario <span className="text-[#FF9800]">Ventiq</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
            Control de activos / ID: {empresaId?.split('-')[0]}
          </p>
        </div>

        {/* FORMULARIO - SIN AZUL */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100">
          <form
            onSubmit={guardarProducto}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            <div className="md:col-span-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Producto
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl focus:ring-0 focus:border-[#FF9800] transition-all outline-none font-bold"
                placeholder="Nombre"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Precio ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl focus:ring-0 focus:border-[#FF9800] transition-all outline-none font-bold"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Stock
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl focus:ring-0 focus:border-[#FF9800] transition-all outline-none font-bold"
                placeholder="0"
                required
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 bg-[#1A1D23] text-white h-[60px] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#FF9800] transition-all shadow-lg active:scale-95"
              >
                {editando ? 'Actualizar' : 'Guardar'}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="bg-slate-100 text-slate-400 h-[60px] w-[60px] rounded-2xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <X />
                </button>
              )}
            </div>
          </form>

          {mensaje && (
            <div className="mt-4 flex items-center justify-center gap-2 text-[#FF9800] font-black text-[10px] uppercase tracking-tighter">
              <CheckCircle2 size={14} /> {mensaje}
            </div>
          )}
        </section>

        {/* TABLA - ESTILO PREMIUM */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50/50">
              <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-6">Detalle</th>
                <th className="p-6">Inversión</th>
                <th className="p-6">Disponibilidad</th>
                <th className="p-6 text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {productos.map((prod) => (
                <tr
                  key={prod.id}
                  className="group hover:bg-slate-50/30 transition-all"
                >
                  <td className="p-6 font-black uppercase text-sm tracking-tight text-[#1A1D23]">
                    {prod.nombre}
                  </td>
                  <td className="p-6 font-black text-[#FF9800]">
                    ${prod.precio.toFixed(2)}
                  </td>
                  <td className="p-6">
                    <span
                      className={`text-[10px] font-black px-3 py-1.5 rounded-lg ${prod.stock < 5 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {prod.stock} UND
                    </span>
                  </td>
                  <td className="p-6 text-right space-x-2">
                    <button
                      onClick={() => prepararEdicion(prod)}
                      className="inline-flex p-2 text-slate-300 hover:text-[#FF9800] transition-colors"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => eliminarProducto(prod.id)}
                      className="inline-flex p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
