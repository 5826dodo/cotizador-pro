'use client';
import imageCompression from 'browser-image-compression';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Loader2,
  Package,
  Camera,
  X,
  Trash2,
  CheckCircle2,
  Pencil,
} from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Categoria {
  id: string;
  nombre: string;
  empresa_id: string;
}

interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  costo_compra: number;
  unidad_medida: string;
  empresa_id: string;
  imagen_url?: string | null;
  categoria_id?: string | null;
  activo: boolean;
  created_at: string;
  categorias?: { nombre: string } | null;
}

const UNIDADES_MEDIDA = [
  'UNIDADES',
  'LITROS',
  'KILOS',
  'METROS',
  'PAQUETES',
] as const;
const ITEMS_POR_PAGINA = 12;

// ── Componente Modal de Recetas con Conversión Inteligente ──────────────────
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
              nombre: r.p_insumo?.nombre || 'Desconocido',
              costo: Number(r.p_insumo?.costo_compra) || 0,
              cantidad: Number(r.cantidad_requerida) || 0,
              unidadBase: r.p_insumo?.unidad_medida || 'UNIDADES',
              unidadReceta:
                r.unidad_medida_receta ||
                r.p_insumo?.unidad_medida ||
                'UNIDADES',
            })),
          );
        }
      } catch (err) {
        console.error(err);
      }
    };
    cargarReceta();
  }, [producto?.id, supabase]);

  const calcularCostoProporcional = (ing: any) => {
    const costo = Number(ing.costo || 0);
    const cant = Number(ing.cantidad || 0);
    if (
      (ing.unidadBase === 'KILOS' && ing.unidadReceta === 'GRAMOS') ||
      (ing.unidadBase === 'LITROS' && ing.unidadReceta === 'ML')
    ) {
      return (costo / 1000) * cant;
    }
    return costo * cant;
  };

  const costoTotal = ingredientes.reduce(
    (acc, i) => acc + calcularCostoProporcional(i),
    0,
  );
  const margen =
    Number(producto?.precio) > 0
      ? ((Number(producto.precio) - costoTotal) / Number(producto.precio)) * 100
      : 0;

  const guardarReceta = async () => {
    setCargando(true);
    try {
      await supabase
        .from('recetas')
        .delete()
        .eq('producto_final_id', producto.id);
      const filas = ingredientes.map((i) => ({
        producto_final_id: producto.id,
        insumo_id: i.id,
        cantidad_requerida: i.cantidad,
        unidad_medida_receta: i.unidadReceta,
        empresa_id: empresaId,
      }));
      if (filas.length > 0) await supabase.from('recetas').insert(filas);
      onClose();
    } catch (err) {
      alert('Error al guardar');
    } finally {
      setCargando(false);
    }
  };

  const insumosFiltrados = (productos || []).filter(
    (p: any) =>
      p.id !== producto?.id &&
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl relative flex flex-col overflow-hidden border border-white/20">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="font-black text-xl text-slate-800 uppercase tracking-tight">
              Receta: {producto?.nombre}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Conversión automática de unidades activada
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          <input
            type="text"
            placeholder="BUSCAR INSUMO..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-100 border-2 border-transparent p-4 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold text-sm"
          />
          {busqueda && (
            <div className="bg-white border shadow-2xl rounded-2xl overflow-hidden mt-[-15px] z-10 relative">
              {insumosFiltrados.slice(0, 5).map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setIngredientes([
                      ...ingredientes,
                      {
                        id: p.id,
                        nombre: p.nombre,
                        costo: p.costo_compra,
                        cantidad: 0,
                        unidadBase: p.unidad_medida,
                        unidadReceta: p.unidad_medida,
                      },
                    ]);
                    setBusqueda('');
                  }}
                  className="w-full text-left p-4 hover:bg-orange-50 border-b last:border-0 font-bold text-xs uppercase flex justify-between"
                >
                  {p.nombre}{' '}
                  <span className="text-slate-400 uppercase">
                    Costo: ${p.costo_compra} / {p.unidad_medida}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
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
                    Base: ${ing.costo} / {ing.unidadBase}
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
                    className="w-20 bg-white border-2 border-slate-200 p-2 rounded-xl text-center font-black text-sm outline-none focus:border-orange-500"
                  />
                  <select
                    value={ing.unidadReceta}
                    onChange={(e) =>
                      setIngredientes(
                        ingredientes.map((i) =>
                          i.id === ing.id
                            ? { ...i, unidadReceta: e.target.value }
                            : i,
                        ),
                      )
                    }
                    className="bg-white border-2 border-slate-200 p-2 rounded-xl text-[10px] font-black uppercase"
                  >
                    <option value={ing.unidadBase}>{ing.unidadBase}</option>
                    {ing.unidadBase === 'KILOS' && (
                      <option value="GRAMOS">GRAMOS</option>
                    )}
                    {ing.unidadBase === 'LITROS' && (
                      <option value="ML">ML</option>
                    )}
                  </select>
                </div>
                <div className="w-20 text-right">
                  <p className="text-xs font-black text-slate-700">
                    ${calcularCostoProporcional(ing).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setIngredientes(ingredientes.filter((i) => i.id !== ing.id))
                  }
                  className="text-slate-300 hover:text-red-500"
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
                Costo Producción
              </p>
              <p className="text-2xl font-black text-emerald-400">
                ${costoTotal.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">
                Margen
              </p>
              <p
                className={`text-2xl font-black ${margen < 30 ? 'text-red-400' : 'text-emerald-400'}`}
              >
                {margen.toFixed(1)}%
              </p>
            </div>
          </div>
          <button
            onClick={guardarReceta}
            disabled={cargando}
            className="bg-orange-500 hover:bg-orange-600 px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
          >
            {cargando ? <Loader2 className="animate-spin" /> : 'Guardar Receta'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente Principal ───────────────────────────────────────────────────
export default function InventarioPage() {
  const supabase = createClient();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [cargando, setCargando] = useState(true);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [costoCompra, setCostoCompra] = useState('');
  const [unidad, setUnidad] = useState<string>('UNIDADES');
  const [categoriaId, setCategoriaId] = useState('');
  const [editando, setEditando] = useState<Producto | null>(null);
  const [productoParaReceta, setProductoParaReceta] = useState<any>(null);

  // Imagen
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [comprimiendo, setComprimiendo] = useState(false);

  // Catálogo
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const paginaRef = useRef(0);
  const [tieneMas, setTieneMas] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);

  const obtenerProductos = useCallback(
    async (idEmpresa: string, reiniciar = false) => {
      const paginaActual = reiniciar ? 0 : paginaRef.current;
      if (!reiniciar) setCargandoMas(true);
      const desde = paginaActual * ITEMS_POR_PAGINA;
      const hasta = desde + ITEMS_POR_PAGINA - 1;

      const { data } = await supabase
        .from('productos')
        .select(`*, categorias ( nombre )`)
        .eq('empresa_id', idEmpresa)
        .order('activo', { ascending: false })
        .order('created_at', { ascending: false })
        .range(desde, hasta);
      if (data) {
        if (reiniciar) {
          setProductos(data as Producto[]);
          paginaRef.current = 1;
        } else {
          setProductos((prev) => [...prev, ...(data as Producto[])]);
          paginaRef.current = paginaActual + 1;
        }
        setTieneMas(data.length === ITEMS_POR_PAGINA);
      }
      setCargandoMas(false);
    },
    [supabase],
  );

  useEffect(() => {
    const iniciar = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('empresa_id, empresas(nombre)')
          .eq('id', user.id)
          .single();
        if (perfil) {
          setEmpresaId(perfil.empresa_id);
          setNombreEmpresa((perfil.empresas as any)?.nombre || 'Mi Empresa');
          await obtenerProductos(perfil.empresa_id, true);
          const { data: cats } = await supabase
            .from('categorias')
            .select('*')
            .eq('empresa_id', perfil.empresa_id)
            .order('nombre');
          setCategorias((cats as Categoria[]) || []);
        }
      }
      setCargando(false);
    };
    iniciar();
  }, [obtenerProductos, supabase]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setComprimiendo(true);
    try {
      const opt = await imageCompression(file, {
        maxSizeMB: 0.7,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/webp',
      });
      const final = new File([opt], `${file.name.split('.')[0]}.webp`, {
        type: 'image/webp',
      });
      setImagenFile(final);
      setPreviewUrl(URL.createObjectURL(final));
    } catch (err) {
      console.error(err);
    } finally {
      setComprimiendo(false);
    }
  };

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    setSubiendoImg(true);
    try {
      let finalUrl = editando?.imagen_url || null;
      if (imagenFile) {
        const name = `${empresaId}/${crypto.randomUUID()}.webp`;
        await supabase.storage.from('productos').upload(name, imagenFile);
        const {
          data: { publicUrl },
        } = supabase.storage.from('productos').getPublicUrl(name);
        finalUrl = publicUrl;
      }
      const payload = {
        nombre,
        descripcion,
        precio: parseFloat(precio),
        stock: parseFloat(stock),
        costo_compra: parseFloat(costoCompra) || 0,
        unidad_medida: unidad,
        empresa_id: empresaId,
        imagen_url: finalUrl,
        categoria_id: categoriaId || null,
      };
      if (editando)
        await supabase.from('productos').update(payload).eq('id', editando.id);
      else await supabase.from('productos').insert([payload]);

      setEditando(null);
      setNombre('');
      setDescripcion('');
      setPrecio('');
      setStock('');
      setCostoCompra('');
      setPreviewUrl(null);
      setImagenFile(null);
      obtenerProductos(empresaId, true);
    } catch (err) {
      alert('Error');
    } finally {
      setSubiendoImg(false);
    }
  };

  if (cargando)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" />
      </div>
    );

  return (
    <main className="min-h-screen bg-slate-100 pb-20 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm flex justify-between items-center">
          <h1 className="text-xl font-black uppercase tracking-tight">
            Panel <span className="text-orange-500">Inventario</span>
          </h1>
          <span className="text-[10px] font-black text-slate-400 uppercase">
            {nombreEmpresa}
          </span>
        </div>

        <section className="bg-white p-8 rounded-[3rem] shadow-xl border border-white">
          <form
            onSubmit={guardarProducto}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] p-4 relative">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  className="w-24 h-24 object-cover rounded-2xl"
                />
              ) : (
                <Camera size={32} className="text-slate-200" />
              )}
              <input
                type="file"
                className="hidden"
                id="img"
                onChange={handleImageChange}
              />
              <label
                htmlFor="img"
                className="cursor-pointer text-[10px] font-black uppercase text-slate-400 mt-2"
              >
                Subir Foto
              </label>
            </div>

            <div className="md:col-span-2 space-y-4">
              <input
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold"
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                    Precio Venta
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                    Costo Compra
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={costoCompra}
                    onChange={(e) => setCostoCompra(e.target.value)}
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <input
                type="number"
                placeholder="Stock"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold"
              />
              <select
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold"
              >
                {UNIDADES_MEDIDA.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={subiendoImg}
                className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs"
              >
                {subiendoImg
                  ? 'Guardando...'
                  : editando
                    ? 'Actualizar'
                    : 'Registrar'}
              </button>
            </div>
          </form>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productos.map((prod) => (
            <div
              key={prod.id}
              className={`bg-white p-5 rounded-[2.5rem] shadow-sm border-2 ${!prod.activo ? 'opacity-50 grayscale' : 'border-white'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                  {prod.imagen_url ? (
                    <img
                      src={prod.imagen_url}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={20} className="m-auto mt-6 text-slate-200" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 text-xs uppercase truncate">
                    {prod.nombre}
                  </h3>
                  <p className="text-orange-500 font-black text-sm">
                    ${prod.precio.toFixed(2)}
                  </p>
                  <span className="text-[9px] font-black text-slate-400">
                    Stock: {prod.stock} {prod.unidad_medida}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setProductoParaReceta(prod)}
                    className="p-2 bg-emerald-50 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                  >
                    <Package size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setEditando(prod);
                      setNombre(prod.nombre);
                      setPrecio(prod.precio.toString());
                      setStock(prod.stock.toString());
                      setCostoCompra(prod.costo_compra.toString());
                      setUnidad(prod.unidad_medida);
                      setPreviewUrl(prod.imagen_url || null);
                    }}
                    className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-orange-500"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {tieneMas && (
          <div className="flex justify-center pb-10">
            <button
              onClick={() => empresaId && obtenerProductos(empresaId)}
              className="px-10 py-4 bg-white border-2 border-slate-200 rounded-full font-black uppercase text-[10px] tracking-widest hover:border-orange-500 transition-all"
            >
              Ver más productos
            </button>
          </div>
        )}
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
