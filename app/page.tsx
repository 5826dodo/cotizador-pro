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
    if (!empresaId) return alert('No se encontró la empresa.');

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
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-ventiq-orange" size={40} />
      </div>
    );

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* HEADER CON IDENTIDAD VENTIQ */}
        <div className="flex justify-between items-end border-b-2 border-slate-200 pb-5">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase text-ventiq-black">
              Gestión de <span className="text-ventiq-orange">Stock</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
              Panel Administrativo Ventiq
            </p>
          </div>
        </div>

        {/* FORMULARIO BASADO EN VARIABLES GLOBALES */}
        <section className="bg-white p-6 rounded-[2rem] shadow-xl border border-white">
          <form
            onSubmit={guardarProducto}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <div className="md:col-span-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                Nombre Ítem
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl outline-none focus:border-ventiq-orange focus:bg-white transition-all font-bold"
                placeholder="Ej. Cámara"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                Precio ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl outline-none focus:border-ventiq-orange focus:bg-white transition-all font-bold"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                Stock
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl outline-none focus:border-ventiq-orange focus:bg-white transition-all font-bold"
                placeholder="0"
                required
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 bg-ventiq-black text-white h-[60px] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-ventiq-orange transition-all shadow-lg active:scale-95"
              >
                {editando ? 'Actualizar' : 'Guardar'}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="bg-slate-100 text-slate-400 h-[60px] w-[60px] rounded-2xl flex items-center justify-center hover:text-red-500 transition-colors"
                >
                  <X />
                </button>
              )}
            </div>
          </form>
          {mensaje && (
            <div className="mt-4 text-center text-ventiq-orange font-black text-[10px] uppercase tracking-widest animate-pulse">
              {mensaje}
            </div>
          )}
        </section>

        {/* TABLA DE PRODUCTOS */}
        <div className="bg-white rounded-[2rem] shadow-lg border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Producto
                </th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Precio
                </th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Stock
                </th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-ventiq-black">
              {productos.map((prod) => (
                <tr
                  key={prod.id}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="p-5 font-bold uppercase text-sm tracking-tight">
                    {prod.nombre}
                  </td>
                  <td className="p-5 font-black text-ventiq-orange">
                    ${prod.precio.toFixed(2)}
                  </td>
                  <td className="p-5">
                    <span
                      className={`px-3 py-1 rounded-lg font-black text-[10px] ${prod.stock < 5 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {prod.stock} UNIDADES
                    </span>
                  </td>
                  <td className="p-5 text-right flex justify-end gap-2">
                    <button
                      onClick={() => prepararEdicion(prod)}
                      className="p-2 text-slate-300 hover:text-ventiq-orange transition-colors"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => eliminarProducto(prod.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {productos.length === 0 && (
            <div className="p-20 text-center text-slate-300 uppercase font-black text-xs tracking-widest">
              No hay stock registrado
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
