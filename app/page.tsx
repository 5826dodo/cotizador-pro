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

function ModalReceta({
  producto,
  productos,
  onClose,
  empresaId,
  supabase,
}: any) {
  const [busqueda, setBusqueda] = useState('');
  const [ingredientes, setIngredientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const cargarReceta = async () => {
      try {
        const { data, error } = await supabase
          .from('recetas')
          .select('*, p_insumo:productos!insumo_id(*)')
          .eq('producto_final_id', producto?.id);

        if (error) throw error;

        if (data) {
          setIngredientes(
            data.map((r: any) => ({
              id: r.insumo_id,
              nombre: r.p_insumo?.nombre || 'Insumo no encontrado',
              costo: Number(r.p_insumo?.costo_compra) || 0,
              cantidad: Number(r.cantidad_requerida) || 0,
              unidad: r.p_insumo?.unidad_medida || 'unid',
            })),
          );
        }
      } catch (err) {
        console.error('Error cargando receta:', err);
      }
    };
    if (producto?.id) cargarReceta();
  }, [producto?.id, supabase]);

  // Filtrado seguro
  const insumosFiltrados = (productos || []).filter(
    (p: any) =>
      p.id !== producto?.id &&
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const agregarIngrediente = (insumo: any) => {
    if (ingredientes.find((i) => i.id === insumo.id)) return;
    setIngredientes([
      ...ingredientes,
      {
        id: insumo.id,
        nombre: insumo.nombre,
        costo: Number(insumo.costo_compra) || 0,
        cantidad: 0,
        unidad: insumo.unidad_medida || 'unid',
      },
    ]);
    setBusqueda('');
  };

  // CÁLCULOS BLINDADOS (Evitan el error .toFixed de undefined)
  const costoTotal = ingredientes.reduce(
    (acc, i) => acc + (Number(i.costo) || 0) * (Number(i.cantidad) || 0),
    0,
  );

  const precioProducto = Number(producto?.precio) || 0;
  const margen =
    precioProducto > 0
      ? ((precioProducto - costoTotal) / precioProducto) * 100
      : 0;

  const guardarReceta = async () => {
    if (!producto?.id) return;
    setCargando(true);
    try {
      await supabase
        .from('recetas')
        .delete()
        .eq('producto_final_id', producto.id);

      const nuevasFilas = ingredientes.map((i) => ({
        producto_final_id: producto.id,
        insumo_id: i.id,
        cantidad_requerida: i.cantidad,
        empresa_id: empresaId,
      }));

      if (nuevasFilas.length > 0) {
        const { error } = await supabase.from('recetas').insert(nuevasFilas);
        if (error) throw error;
      }
      alert('Receta guardada');
      onClose();
    } catch (err) {
      alert('Error al guardar');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  // Si no hay producto, no renderizamos nada para no bloquear
  if (!producto) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl my-auto shadow-2xl relative border border-white/20 flex flex-col">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="font-black text-xl text-slate-800 uppercase tracking-tight">
              Receta: {producto.nombre}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase">
              Ajusta los insumos para calcular rentabilidad
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[50vh] overflow-y-auto bg-white">
          <div className="relative">
            <input
              type="text"
              placeholder="BUSCAR INGREDIENTE (EJ. CARNE, CEBOLLA...)"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-100 border-2 border-transparent p-4 rounded-2xl outline-none focus:border-ventiq-orange focus:bg-white transition-all font-bold text-sm text-slate-700"
            />
            {busqueda.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border shadow-2xl rounded-2xl mt-2 z-[10000] overflow-hidden">
                {insumosFiltrados.slice(0, 5).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => agregarIngrediente(p)}
                    className="w-full text-left p-4 hover:bg-orange-50 border-b last:border-0 flex justify-between items-center"
                  >
                    <span className="font-bold text-sm uppercase text-slate-700">
                      {p.nombre}
                    </span>
                    <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase">
                      Stock: {p.stock}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {ingredientes.length === 0 && (
              <p className="text-center py-10 text-slate-300 font-bold uppercase text-[10px] tracking-widest">
                No hay ingredientes agregados
              </p>
            )}
            {ingredientes.map((ing) => (
              <div
                key={ing.id}
                className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100"
              >
                <div className="flex-1">
                  <p className="font-black text-xs text-slate-700 uppercase">
                    {ing.nombre}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    COSTO UNIT: ${ing.costo.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.001"
                    value={ing.cantidad}
                    onChange={(e) =>
                      setIngredientes(
                        ingredientes.map((i) =>
                          i.id === ing.id
                            ? {
                                ...i,
                                cantidad: parseFloat(e.target.value) || 0,
                              }
                            : i,
                        ),
                      )
                    }
                    className="w-24 bg-white border-2 border-slate-200 p-2 rounded-xl text-center font-black text-sm outline-none focus:border-ventiq-orange text-slate-700"
                  />
                  <span className="text-[10px] font-bold text-slate-400 uppercase w-8">
                    {ing.unidad}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setIngredientes(ingredientes.filter((i) => i.id !== ing.id))
                  }
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex gap-8">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">
                Costo Total
              </p>
              <p className="text-xl font-black text-emerald-400">
                ${costoTotal.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">
                Margen Real
              </p>
              <p
                className={`text-xl font-black ${margen < 30 ? 'text-red-400' : 'text-emerald-400'}`}
              >
                {margen.toFixed(1)}%
              </p>
            </div>
          </div>
          <button
            onClick={guardarReceta}
            disabled={cargando}
            className="bg-ventiq-orange hover:bg-orange-600 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2"
          >
            {cargando ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}
            GUARDAR
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [costoCompra, setCostoCompra] = useState(''); // Nuevo estado para materia prima
  const [mostrarModalReceta, setMostrarModalReceta] = useState(false);
  const [productoParaReceta, setProductoParaReceta] = useState<any>(null);

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
      costo_compra: parseFloat(costoCompra) || 0,
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
            {/* Inserta esto al lado de Precio ($) en tu grid */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                Costo Compra ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={costoCompra}
                onChange={(e) => setCostoCompra(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl outline-none focus:border-ventiq-orange focus:bg-white transition-all font-bold"
                placeholder="0.00"
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
                    {/* BOTÓN DE RECETA: Solo visible para productos que no son materia prima básica */}
                    <button
                      onClick={() => {
                        setProductoParaReceta(prod);
                      }}
                      className="p-2 text-slate-300 hover:text-emerald-500 transition-colors flex flex-col items-center"
                      title="Configurar Receta"
                    >
                      <Package size={18} />
                      <span className="text-[8px] font-black uppercase">
                        Receta
                      </span>
                    </button>
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
      {/* Al final de tu componente InventarioPage */}
      {productoParaReceta && (
        <ModalReceta
          producto={productoParaReceta}
          productos={productos}
          empresaId={empresaId}
          supabase={supabase}
          onClose={() => setProductoParaReceta(null)}
        />
      )}
    </main>
  );
}
