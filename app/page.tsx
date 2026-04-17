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

// --- COMPONENTE MODAL DE RECETAS (BLINDADO) ---
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
      if (!producto?.id) return;
      try {
        const { data, error } = await supabase
          .from('recetas')
          .select('*, p_insumo:productos!insumo_id(*)')
          .eq('producto_final_id', producto.id);

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
    cargarReceta();
  }, [producto?.id, supabase]);

  const insumosFiltrados = (productos || []).filter(
    (p: any) =>
      p.id !== producto?.id &&
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()),
  );

  // Cálculos ultra seguros para evitar bloqueos en Chrome
  const costoTotal = ingredientes.reduce(
    (acc, i) => acc + Number(i.costo || 0) * Number(i.cantidad || 0),
    0,
  );
  const precioVenta = Number(producto?.precio || 0);
  const margen =
    precioVenta > 0 ? ((precioVenta - costoTotal) / precioVenta) * 100 : 0;

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
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative flex flex-col overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="font-black text-xl text-slate-800 uppercase tracking-tight">
              Receta: {producto?.nombre}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Calculadora de rentabilidad real
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
          <input
            type="text"
            placeholder="BUSCAR INGREDIENTE..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-100 border-2 border-transparent p-4 rounded-2xl outline-none focus:border-ventiq-orange focus:bg-white transition-all font-bold text-sm text-slate-600"
          />
          {busqueda && (
            <div className="bg-white border shadow-2xl rounded-2xl overflow-hidden mt-[-15px]">
              {insumosFiltrados.slice(0, 5).map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => {
                    if (!ingredientes.find((i) => i.id === p.id)) {
                      setIngredientes([
                        ...ingredientes,
                        {
                          id: p.id,
                          nombre: p.nombre,
                          costo: p.costo_compra,
                          cantidad: 0,
                          unidad: p.unidad_medida,
                        },
                      ]);
                    }
                    setBusqueda('');
                  }}
                  className="w-full text-left p-4 hover:bg-orange-50 border-b last:border-0 font-bold text-xs uppercase flex justify-between text-slate-600"
                >
                  {p.nombre}{' '}
                  <span className="text-slate-400 font-black">
                    STOCK: {p.stock}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {ingredientes.length === 0 && (
              <div className="text-center py-10 text-slate-300 font-black text-[10px] uppercase tracking-tighter">
                Agrega ingredientes para calcular
              </div>
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
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Costo: ${Number(ing.costo || 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
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
                    className="w-20 bg-white border-2 border-slate-200 p-2 rounded-xl text-center font-black text-sm outline-none focus:border-ventiq-orange text-slate-700"
                  />
                  <span className="text-[10px] font-black text-slate-400 uppercase w-8">
                    {ing.unidad || 'unid'}
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
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Costo Total
              </p>
              <p className="text-xl font-black text-emerald-400">
                ${costoTotal.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
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
            )}{' '}
            GUARDAR
          </button>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function InventarioPage() {
  const supabase = createClient();
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [costoCompra, setCostoCompra] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [editando, setEditando] = useState<any>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
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
    const inicializar = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('empresa_id')
          .eq('id', user.id)
          .single();
        if (perfil) {
          setEmpresaId(perfil.empresa_id);
          await obtenerProductos(perfil.empresa_id);
        }
      }
      setCargando(false);
    };
    inicializar();
  }, []);

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    const p = {
      nombre,
      precio: parseFloat(precio) || 0,
      stock: parseInt(stock) || 0,
      costo_compra: parseFloat(costoCompra) || 0,
      empresa_id: empresaId,
    };

    if (editando) {
      await supabase.from('productos').update(p).eq('id', editando.id);
    } else {
      await supabase.from('productos').insert([p]);
    }
    setNombre('');
    setPrecio('');
    setStock('');
    setCostoCompra('');
    setEditando(null);
    obtenerProductos(empresaId);
  };

  const eliminarProducto = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    await supabase.from('productos').delete().eq('id', id);
    if (empresaId) obtenerProductos(empresaId);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-20 lg:p-10 lg:pl-32">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
          <form
            onSubmit={guardarProducto}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            <input
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-600 focus:bg-white focus:ring-2 ring-orange-100 transition-all"
            />
            <input
              placeholder="Precio Venta"
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-600 focus:bg-white focus:ring-2 ring-orange-100 transition-all"
            />
            <input
              placeholder="Costo Compra"
              type="number"
              value={costoCompra}
              onChange={(e) => setCostoCompra(e.target.value)}
              className="p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-600 focus:bg-white focus:ring-2 ring-orange-100 transition-all"
            />
            <input
              placeholder="Stock"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-600 focus:bg-white focus:ring-2 ring-orange-100 transition-all"
            />
            <button className="md:col-span-4 bg-ventiq-orange text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all">
              {editando ? 'Actualizar Producto' : 'Registrar en Inventario'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Producto
                </th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Costo
                </th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Venta
                </th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Stock
                </th>
                <th className="p-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {productos.map((prod) => (
                <tr
                  key={prod.id}
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="p-6 font-bold text-slate-700 uppercase text-sm">
                    {prod.nombre}
                  </td>
                  <td className="p-6 font-black text-slate-400 text-sm">
                    ${(Number(prod.costo_compra) || 0).toFixed(2)}
                  </td>
                  <td className="p-6 font-black text-ventiq-orange text-sm">
                    ${(Number(prod.precio) || 0).toFixed(2)}
                  </td>
                  <td className="p-6 text-sm">
                    <span
                      className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase ${prod.stock < 5 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {prod.stock} UNID
                    </span>
                  </td>
                  <td className="p-6 text-right flex justify-end gap-2">
                    <button
                      onClick={() => setProductoParaReceta(prod)}
                      className="p-2 text-slate-300 hover:text-emerald-500 transition-colors flex flex-col items-center"
                    >
                      <Package size={18} />
                      <span className="text-[8px] font-black uppercase">
                        Receta
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setEditando(prod);
                        setNombre(prod.nombre);
                        setPrecio(prod.precio);
                        setStock(prod.stock);
                        setCostoCompra(prod.costo_compra);
                      }}
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
        </div>
      </div>

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
