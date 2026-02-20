'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Loader2,
  Package,
  Store,
  Hash,
  Tag,
  Trash2,
  Edit3,
  X,
} from 'lucide-react';

export default function InventarioPage() {
  const supabase = createClient();
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [unidad, setUnidad] = useState('UNIDADES'); // Nuevo estado para unidad
  const [productos, setProductos] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [editando, setEditando] = useState<any>(null);

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nombreEmpresa, setNombreEmpresa] = useState(''); // Nombre de la empresa
  const [cargando, setCargando] = useState(true);

  const unidadesMedida = ['UNIDADES', 'LITROS', 'KILOS', 'METROS', 'PAQUETES'];

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
          .select('empresa_id, empresas(nombre)') // Join para traer el nombre de la empresa
          .eq('id', user.id)
          .single();

        if (perfil?.empresa_id) {
          setEmpresaId(perfil.empresa_id);
          setNombreEmpresa(perfil.empresas?.nombre || 'Mi Empresa');
          await obtenerProductos(perfil.empresa_id);
        }
      }
      setCargando(false);
    };
    inicializarDatos();
  }, []);

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return alert('Error de sesión');

    const payload = {
      nombre,
      precio: parseFloat(precio),
      stock: parseFloat(stock), // Ahora aceptamos decimales
      unidad_medida: unidad, // Guardamos la unidad
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
      setMensaje(editando ? '✅ Actualizado' : '🚀 Producto Registrado');
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

  // ... (eliminarProducto y prepararEdicion se mantienen similares, ajustando stock)
  const prepararEdicion = (prod: any) => {
    setEditando(prod);
    setNombre(prod.nombre);
    setPrecio(prod.precio.toString());
    setStock(prod.stock.toString());
    setUnidad(prod.unidad_medida || 'UNIDADES');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setNombre('');
    setPrecio('');
    setStock('');
    setUnidad('UNIDADES');
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
    <main className="min-h-screen bg-slate-100 text-ventiq-black pb-20 md:pb-8">
      {/* EVITAR RECARGA POR SCROLL EN MÓVIL */}
      <style jsx global>{`
        body {
          overscroll-behavior-y: contain;
        }
      `}</style>

      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* HEADER CON NOMBRE DE EMPRESA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-white">
          <div>
            <div className="flex items-center gap-2 text-ventiq-orange mb-1">
              <Store size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                {nombreEmpresa}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">
              Control de <span className="text-ventiq-orange">Almacén</span>
            </h1>
          </div>
          <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">
              Estado de Conexión
            </p>
            <p className="text-green-500 text-xs font-black uppercase tracking-tighter flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>{' '}
              En Línea
            </p>
          </div>
        </div>

        {/* FORMULARIO MEJORADO */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white">
          <form
            onSubmit={guardarProducto}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 ml-2">
                Producto
              </label>
              <input
                placeholder="Ej. Cloro Industrial"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl focus:border-ventiq-orange focus:bg-white transition-all outline-none font-bold text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 ml-2">
                Unidad
              </label>
              <select
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl focus:border-ventiq-orange focus:bg-white transition-all outline-none font-bold text-sm appearance-none"
              >
                {unidadesMedida.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-right">
              {/* Visualización rápida de lo que estamos haciendo */}
              <div className="h-6"></div>
              <button
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg ${editando ? 'bg-ventiq-orange text-white' : 'bg-ventiq-black text-white hover:bg-slate-800'}`}
              >
                {editando ? 'Actualizar' : 'Registrar'}
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 ml-2">
                Precio ($)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl focus:border-ventiq-orange focus:bg-white transition-all outline-none font-bold text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 ml-2">
                Stock (Acepta decimales)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl focus:border-ventiq-orange focus:bg-white transition-all outline-none font-bold text-sm text-ventiq-orange"
                required
              />
            </div>

            {editando && (
              <button
                type="button"
                onClick={cancelarEdicion}
                className="md:mt-5 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl font-bold p-4 hover:bg-red-100 transition-all"
              >
                <X size={20} />{' '}
                <span className="ml-2 uppercase text-xs">Cancelar</span>
              </button>
            )}
          </form>
        </section>

        {/* LISTADO TIPO APP */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] ml-2">
            Productos en Almacén
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productos.map((prod) => (
              <div
                key={prod.id}
                className="bg-white p-5 rounded-[2rem] border border-white shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-ventiq-black uppercase text-sm leading-tight">
                      {prod.nombre}
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {prod.unidad_medida || 'UNIDADES'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => prepararEdicion(prod)}
                      className="p-2 bg-orange-50 text-ventiq-orange rounded-xl hover:bg-ventiq-orange hover:text-white transition-all"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => eliminarProducto(prod.id)}
                      className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Precio
                    </p>
                    <p className="text-xl font-black text-ventiq-black">
                      ${prod.precio.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Stock Disponible
                    </p>
                    <p
                      className={`text-lg font-black ${prod.stock < 5 ? 'text-red-500 animate-pulse' : 'text-ventiq-orange'}`}
                    >
                      {prod.stock}{' '}
                      <span className="text-[10px]">
                        {prod.unidad_medida === 'LITROS' ? 'Lts' : 'Und'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
