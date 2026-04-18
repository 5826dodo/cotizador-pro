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
  ExternalLink,
  RefreshCw,
  ChefHat,
  FlaskConical,
  TrendingUp,
  AlertTriangle,
  Copy,
  Info,
  Zap,
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
  es_materia_prima?: boolean;
}

interface Ingrediente {
  id: string;
  nombre: string;
  costo: number;
  cantidad: number;
  unidadBase: string;
  unidadReceta: string;
  stockDisponible: number;
}

const UNIDADES_MEDIDA = [
  'UNIDADES',
  'LITROS',
  'KILOS',
  'METROS',
  'PAQUETES',
] as const;
const ITEMS_POR_PAGINA = 12;

// ── Utilidades ─────────────────────────────────────────────────────────────
const calcularFactorConversion = (
  unidadBase: string,
  unidadReceta: string,
): number => {
  if (unidadBase === 'KILOS' && unidadReceta === 'GRAMOS') return 1000;
  if (unidadBase === 'LITROS' && unidadReceta === 'ML') return 1000;
  return 1;
};

const calcularCostoPorUnidad = (ing: Ingrediente): number => {
  const factor = calcularFactorConversion(ing.unidadBase, ing.unidadReceta);
  return (ing.costo / factor) * ing.cantidad;
};

const calcularStockEnUnidadReceta = (ing: Ingrediente): number => {
  const factor = calcularFactorConversion(ing.unidadBase, ing.unidadReceta);
  return ing.stockDisponible * factor;
};

// Cuántas unidades del producto final se pueden fabricar con el stock actual
const calcularUnidadesFabricables = (ingredientes: Ingrediente[]): number => {
  if (ingredientes.length === 0) return 0;
  const limitantes = ingredientes.map((ing) => {
    if (ing.cantidad <= 0) return Infinity;
    const stockEnUnidadReceta = calcularStockEnUnidadReceta(ing);
    return Math.floor(stockEnUnidadReceta / ing.cantidad);
  });
  return Math.min(...limitantes);
};

// ── Modal de Receta ────────────────────────────────────────────────────────
function ModalReceta({
  producto,
  productos,
  onClose,
  empresaId,
  supabase,
}: any) {
  const [busqueda, setBusqueda] = useState('');
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoReceta, setCargandoReceta] = useState(true);

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
              stockDisponible: Number(r.p_insumo?.stock) || 0,
            })),
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCargandoReceta(false);
      }
    };
    cargarReceta();
  }, [producto?.id, supabase]);

  const costoTotal = ingredientes.reduce(
    (acc, i) => acc + calcularCostoPorUnidad(i),
    0,
  );
  const margen =
    Number(producto?.precio) > 0
      ? ((Number(producto.precio) - costoTotal) / Number(producto.precio)) * 100
      : 0;
  const unidadesFabricables = calcularUnidadesFabricables(ingredientes);
  const gananciaPotencial =
    unidadesFabricables * (Number(producto?.precio) - costoTotal);

  const ingredienteLimitante =
    ingredientes.length > 0
      ? ingredientes.reduce((min, ing) => {
          const unidadesEste =
            ing.cantidad > 0
              ? Math.floor(calcularStockEnUnidadReceta(ing) / ing.cantidad)
              : Infinity;
          const unidadesMin =
            min.cantidad > 0
              ? Math.floor(calcularStockEnUnidadReceta(min) / min.cantidad)
              : Infinity;
          return unidadesEste < unidadesMin ? ing : min;
        })
      : null;

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
      onClose(true);
    } catch (err) {
      alert('Error al guardar receta');
    } finally {
      setCargando(false);
    }
  };

  // Solo materia prima o todos los productos (excluyendo el producto actual)
  const insumosFiltrados = (productos || []).filter(
    (p: any) =>
      p.id !== producto?.id &&
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const agregarIngrediente = (p: any) => {
    if (ingredientes.find((i) => i.id === p.id)) return;
    setIngredientes([
      ...ingredientes,
      {
        id: p.id,
        nombre: p.nombre,
        costo: p.costo_compra,
        cantidad: 1,
        unidadBase: p.unidad_medida,
        unidadReceta: p.unidad_medida,
        stockDisponible: Number(p.stock) || 0,
      },
    ]);
    setBusqueda('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl relative flex flex-col overflow-hidden max-h-[95vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-xl">
              <ChefHat size={20} />
            </div>
            <div>
              <h2 className="font-black text-lg uppercase tracking-tight">
                Receta: {producto?.nombre}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Define los insumos necesarios para fabricar 1 unidad
              </p>
            </div>
          </div>
          <button
            onClick={() => onClose(false)}
            className="p-2 hover:bg-white/10 rounded-full"
          >
            <X size={22} />
          </button>
        </div>

        {/* Stats de producción */}
        {!cargandoReceta && ingredientes.length > 0 && (
          <div className="grid grid-cols-4 gap-0 border-b border-slate-100">
            <div className="p-4 text-center border-r border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Costo x Unidad
              </p>
              <p className="text-xl font-black text-slate-800">
                ${costoTotal.toFixed(2)}
              </p>
            </div>
            <div className="p-4 text-center border-r border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Margen
              </p>
              <p
                className={`text-xl font-black ${margen < 20 ? 'text-red-500' : margen < 40 ? 'text-amber-500' : 'text-emerald-500'}`}
              >
                {margen.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 text-center border-r border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Puedes Fabricar
              </p>
              <p
                className={`text-xl font-black ${unidadesFabricables === 0 ? 'text-red-500' : unidadesFabricables < 5 ? 'text-amber-500' : 'text-emerald-500'}`}
              >
                {unidadesFabricables === Infinity ? '∞' : unidadesFabricables}{' '}
                <span className="text-xs">uds</span>
              </p>
            </div>
            <div className="p-4 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Ganancia Potencial
              </p>
              <p
                className={`text-xl font-black ${gananciaPotencial <= 0 ? 'text-red-500' : 'text-emerald-500'}`}
              >
                ${gananciaPotencial.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Alerta ingrediente limitante */}
        {!cargandoReceta &&
          ingredientes.length > 0 &&
          ingredienteLimitante &&
          unidadesFabricables < 10 && (
            <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
              <AlertTriangle
                size={16}
                className="text-amber-500 flex-shrink-0"
              />
              <p className="text-xs font-bold text-amber-700">
                <span className="font-black">Insumo limitante:</span>{' '}
                <span className="text-amber-600">
                  {ingredienteLimitante.nombre}
                </span>
                {' — '}
                solo tienes{' '}
                {calcularStockEnUnidadReceta(ingredienteLimitante).toFixed(
                  1,
                )}{' '}
                {ingredienteLimitante.unidadReceta.toLowerCase()} disponibles.
                {unidadesFabricables === 0 && ' ¡Necesitas reponer stock!'}
              </p>
            </div>
          )}

        {/* Buscador */}
        <div className="p-6 pb-2 space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            Agregar Insumo o Materia Prima
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar producto del inventario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-100 border-2 border-transparent p-4 rounded-2xl outline-none focus:border-orange-500 font-bold text-sm transition-all"
            />
            {busqueda && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border shadow-2xl rounded-2xl overflow-hidden z-10">
                {insumosFiltrados.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400 font-bold text-center">
                    No se encontraron productos
                  </div>
                ) : (
                  insumosFiltrados.slice(0, 6).map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => agregarIngrediente(p)}
                      className="w-full text-left p-4 hover:bg-orange-50 border-b last:border-0 transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-black text-xs uppercase text-slate-800">
                            {p.nombre}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">
                            Stock: {p.stock} {p.unidad_medida}
                          </p>
                        </div>
                        <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-full">
                          ${p.costo_compra} / {p.unidad_medida}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Lista de ingredientes */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-2 min-h-0">
          {cargandoReceta ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-orange-500" size={24} />
            </div>
          ) : ingredientes.length === 0 ? (
            <div className="text-center py-8">
              <FlaskConical size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-xs font-black text-slate-300 uppercase">
                Sin ingredientes aún
              </p>
              <p className="text-[10px] text-slate-300 font-bold mt-1">
                Busca y agrega los insumos necesarios para fabricar este
                producto
              </p>
            </div>
          ) : (
            ingredientes.map((ing) => {
              const costoIng = calcularCostoPorUnidad(ing);
              const stockEnReceta = calcularStockEnUnidadReceta(ing);
              const unidadesEste =
                ing.cantidad > 0
                  ? Math.floor(stockEnReceta / ing.cantidad)
                  : Infinity;
              const esLimitante =
                unidadesEste === unidadesFabricables && unidadesEste < Infinity;

              return (
                <div
                  key={ing.id}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${esLimitante && unidadesFabricables < 10 ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-xs text-slate-700 uppercase truncate">
                        {ing.nombre}
                      </p>
                      {esLimitante && unidadesFabricables < 10 && (
                        <span className="text-[8px] font-black bg-amber-400 text-white px-2 py-0.5 rounded-full uppercase flex-shrink-0">
                          Limitante
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      Stock: {ing.stockDisponible} {ing.unidadBase} →{' '}
                      {stockEnReceta.toFixed(1)} {ing.unidadReceta}
                    </p>
                  </div>

                  {/* Cantidad */}
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        value={ing.cantidad}
                        min="0"
                        step="0.01"
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
                        className="w-20 bg-white border-2 border-slate-200 p-2 rounded-xl text-center font-black text-sm focus:border-orange-500 outline-none"
                      />
                    </div>

                    {/* Unidad */}
                    <div className="text-center">
                      <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">
                        Unidad
                      </label>
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
                        className="bg-white border-2 border-slate-200 p-2 rounded-xl text-[10px] font-black uppercase focus:border-orange-500 outline-none"
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
                  </div>

                  {/* Costo calculado */}
                  <div className="text-right w-20 flex-shrink-0">
                    <p className="text-[8px] font-black text-slate-400 uppercase">
                      Costo
                    </p>
                    <p className="text-sm font-black text-slate-700">
                      ${costoIng.toFixed(2)}
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold">
                      {unidadesEste === Infinity ? '∞' : unidadesEste} uds
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setIngredientes(
                        ingredientes.filter((i) => i.id !== ing.id),
                      )
                    }
                    className="text-slate-300 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-6">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Costo Total
              </p>
              <p className="text-2xl font-black text-emerald-400">
                ${costoTotal.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Precio Venta
              </p>
              <p className="text-2xl font-black text-white">
                ${Number(producto?.precio).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Ganancia x Ud
              </p>
              <p
                className={`text-2xl font-black ${Number(producto?.precio) - costoTotal <= 0 ? 'text-red-400' : 'text-orange-400'}`}
              >
                ${(Number(producto?.precio) - costoTotal).toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={guardarReceta}
            disabled={cargando}
            className="bg-orange-500 hover:bg-orange-600 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {cargando ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            {cargando ? 'Guardando...' : 'Guardar Receta'}
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
  const [productoParaReceta, setProductoParaReceta] = useState<Producto | null>(
    null,
  );

  // Imagen
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [comprimiendo, setComprimiendo] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  // Catálogo
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const paginaRef = useRef(0);
  const [tieneMas, setTieneMas] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    texto: string;
    tipo: 'ok' | 'error';
  } | null>(null);

  // Capacidades de producción cargadas
  const [capacidades, setCapacidades] = useState<Record<string, number>>({});

  const mostrarToast = (texto: string, tipo: 'ok' | 'error' = 'ok') => {
    setToast({ texto, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const asignarPreview = (url: string | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (url?.startsWith('blob:')) objectUrlRef.current = url;
    setPreviewUrl(url);
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // ── Cargar capacidades de producción ──────────────────────────────────
  const cargarCapacidades = useCallback(
    async (idEmpresa: string, listProductos: Producto[]) => {
      try {
        const { data: recetas } = await supabase
          .from('recetas')
          .select(
            '*, p_insumo:productos!insumo_id(stock, unidad_medida, costo_compra)',
          )
          .eq('empresa_id', idEmpresa);

        if (!recetas) return;

        // Agrupar por producto_final_id
        const recetasPorProducto: Record<string, any[]> = {};
        for (const r of recetas) {
          if (!recetasPorProducto[r.producto_final_id]) {
            recetasPorProducto[r.producto_final_id] = [];
          }
          recetasPorProducto[r.producto_final_id].push(r);
        }

        const nuevasCapacidades: Record<string, number> = {};
        for (const [prodId, ings] of Object.entries(recetasPorProducto)) {
          const ingredientes: Ingrediente[] = ings.map((r: any) => ({
            id: r.insumo_id,
            nombre: '',
            costo: Number(r.p_insumo?.costo_compra) || 0,
            cantidad: Number(r.cantidad_requerida) || 0,
            unidadBase: r.p_insumo?.unidad_medida || 'UNIDADES',
            unidadReceta:
              r.unidad_medida_receta || r.p_insumo?.unidad_medida || 'UNIDADES',
            stockDisponible: Number(r.p_insumo?.stock) || 0,
          }));
          nuevasCapacidades[prodId] = calcularUnidadesFabricables(ingredientes);
        }
        setCapacidades(nuevasCapacidades);
      } catch (err) {
        console.error('Error cargando capacidades:', err);
      }
    },
    [supabase],
  );

  // ── Productos ──────────────────────────────────────────────────────────
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
        const nuevos = data as Producto[];
        if (reiniciar) {
          setProductos(nuevos);
          paginaRef.current = 1;
          cargarCapacidades(idEmpresa, nuevos);
        } else {
          setProductos((prev) => {
            const todos = [...prev, ...nuevos];
            cargarCapacidades(idEmpresa, todos);
            return todos;
          });
          paginaRef.current = paginaActual + 1;
        }
        setTieneMas(nuevos.length === ITEMS_POR_PAGINA);
      }
      setCargandoMas(false);
    },
    [supabase, cargarCapacidades],
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

  // ── Imagen ─────────────────────────────────────────────────────────────
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('Imagen demasiado pesada. Máximo 15 MB.');
      return;
    }
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
      asignarPreview(URL.createObjectURL(final));
    } catch (err) {
      console.error(err);
      setImagenFile(file);
      asignarPreview(URL.createObjectURL(file));
    } finally {
      setComprimiendo(false);
    }
  };

  const subirImagen = async (file: File): Promise<string> => {
    const fileName = `${empresaId}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage
      .from('productos')
      .upload(fileName, file, { contentType: 'image/webp', upsert: true });
    if (uploadError) throw uploadError;
    const {
      data: { publicUrl },
    } = supabase.storage.from('productos').getPublicUrl(fileName);
    return publicUrl;
  };

  // ── CRUD ───────────────────────────────────────────────────────────────
  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    setSubiendoImg(true);
    try {
      let finalUrl: string | null = editando?.imagen_url ?? null;
      if (imagenFile) finalUrl = await subirImagen(imagenFile);

      const payload = {
        nombre,
        descripcion,
        precio: parseFloat(precio) || 0,
        stock: parseFloat(stock) || 0,
        costo_compra: parseFloat(costoCompra) || 0,
        unidad_medida: unidad,
        empresa_id: empresaId,
        imagen_url: finalUrl,
        categoria_id: categoriaId || null,
        activo: true,
      };

      if (editando) {
        await supabase.from('productos').update(payload).eq('id', editando.id);
        mostrarToast('✅ Producto actualizado');
      } else {
        await supabase.from('productos').insert([payload]);
        mostrarToast('🚀 Producto registrado');
      }

      cancelarEdicion();
      obtenerProductos(empresaId, true);
    } catch (err: any) {
      mostrarToast('Error al guardar: ' + err.message, 'error');
    } finally {
      setSubiendoImg(false);
    }
  };

  const cambiarEstadoProducto = async (id: string, estadoActual: boolean) => {
    try {
      const { error } = await supabase
        .from('productos')
        .update({ activo: !estadoActual })
        .eq('id', id);
      if (!error && empresaId) {
        obtenerProductos(empresaId, true);
        mostrarToast(
          estadoActual ? '📦 Producto archivado' : '✅ Producto reactivado',
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const prepararEdicion = (prod: Producto) => {
    setEditando(prod);
    setNombre(prod.nombre);
    setDescripcion(prod.descripcion || '');
    setPrecio(prod.precio.toString());
    setStock(prod.stock.toString());
    setCostoCompra(prod.costo_compra.toString());
    setUnidad(prod.unidad_medida || 'UNIDADES');
    setCategoriaId(prod.categoria_id || '');
    setPreviewUrl(prod.imagen_url ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setNombre('');
    setDescripcion('');
    setPrecio('');
    setStock('');
    setCostoCompra('');
    setUnidad('UNIDADES');
    setCategoriaId('');
    setImagenFile(null);
    asignarPreview(null);
  };

  if (cargando)
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="mt-4 font-black text-xs uppercase tracking-widest text-slate-400">
          Cargando inventario...
        </p>
      </div>
    );

  return (
    <main className="min-h-screen bg-slate-100 pb-20 p-4 md:p-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[9999] px-6 py-3 rounded-2xl text-white text-xs font-black shadow-xl animate-bounce ${toast.tipo === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}
        >
          {toast.texto}
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* ENCABEZADO */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
              {nombreEmpresa}
            </span>
            <h1 className="text-xl font-black uppercase tracking-tight">
              Gestión de Inventario
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const url = `${window.location.origin}/catalogo/${empresaId}`;
                navigator.clipboard.writeText(url);
                mostrarToast('¡Enlace copiado! 📋');
              }}
              className="flex items-center gap-2 bg-slate-100 text-slate-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              <Copy size={14} /> Copiar Link
            </button>
            {empresaId && (
              <a
                href={`/catalogo/${empresaId}`}
                target="_blank"
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-lg shadow-slate-200"
              >
                <ExternalLink size={14} /> Ver Catálogo
              </a>
            )}
          </div>
        </div>

        {/* FORMULARIO */}
        <section className="bg-white p-8 rounded-[3rem] shadow-xl border border-white">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {editando ? '✏️ Editando producto' : '➕ Nuevo producto'}
            </span>
          </div>
          <form
            onSubmit={guardarProducto}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {/* Foto */}
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] p-4 hover:bg-slate-50 transition-all group relative overflow-hidden">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  className="w-24 h-24 object-cover rounded-2xl shadow-md"
                  alt="Preview"
                />
              ) : (
                <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
                  <Camera size={32} />
                </div>
              )}
              <label className="cursor-pointer text-[10px] font-black uppercase text-slate-400 mt-2 group-hover:text-orange-500 transition-colors">
                {comprimiendo
                  ? 'Optimizando...'
                  : previewUrl
                    ? 'Cambiar foto'
                    : 'Subir foto'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={comprimiendo}
                />
              </label>
            </div>

            {/* Campos principales */}
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                  Nombre
                </label>
                <input
                  placeholder="Ej: Hamburguesa con Queso"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold placeholder:text-slate-300 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                  Descripción / Tallas / Colores / Notas
                </label>
                <textarea
                  placeholder="Ej: Talla L, Color Azul, o especificaciones del servicio..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold placeholder:text-slate-300 transition-all resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                    Precio Venta
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold focus:ring-2 ring-orange-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                    Costo Insumo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={costoCompra}
                    onChange={(e) => setCostoCompra(e.target.value)}
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold focus:ring-2 ring-orange-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                    Categoría
                  </label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-xs border-2 border-transparent focus:border-orange-500 transition-all"
                  >
                    <option value="">General</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Stock y botones */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                    Stock
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    required
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-orange-500 focus:ring-2 ring-orange-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                    Medida
                  </label>
                  <select
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-xs border-2 border-transparent focus:border-orange-500 transition-all"
                  >
                    {UNIDADES_MEDIDA.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={subiendoImg || comprimiendo}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-200"
              >
                {subiendoImg ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Guardando...
                  </>
                ) : comprimiendo ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />{' '}
                    Optimizando...
                  </>
                ) : editando ? (
                  '✏️ Actualizar Producto'
                ) : (
                  '🚀 Registrar Producto'
                )}
              </button>

              {editando && (
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="w-full py-3 bg-red-50 text-red-500 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
                >
                  <X size={14} /> Cancelar Edición
                </button>
              )}
            </div>
          </form>
        </section>

        {/* TIP RECETAS */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 rounded-[2rem] flex items-center gap-4">
          <div className="p-3 bg-orange-500/20 rounded-2xl flex-shrink-0">
            <Zap size={20} className="text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="text-white text-xs font-black uppercase">
              Sistema de Recetas Inteligente
            </p>
            <p className="text-slate-400 text-[10px] font-bold mt-0.5">
              Haz clic en el ícono <ChefHat size={10} className="inline" /> de
              cualquier producto para definir su receta. El sistema calculará
              automáticamente cuántas unidades puedes fabricar con tu stock
              actual.
            </p>
          </div>
        </div>

        {/* LISTADO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productos.map((prod) => {
            const precioNum = Number(prod.precio) || 0;
            const stockNum = Number(prod.stock) || 0;
            const esActivo = prod.activo !== false;
            const esStockCritico = stockNum <= 5;
            const capacidadFab = capacidades[prod.id];
            const tieneReceta = capacidadFab !== undefined;

            return (
              <div
                key={prod.id}
                className={`bg-white p-5 rounded-[2.5rem] shadow-sm border-2 transition-all ${
                  !esActivo
                    ? 'opacity-50 grayscale border-dashed border-slate-200'
                    : tieneReceta && capacidadFab === 0
                      ? 'border-red-200'
                      : esStockCritico
                        ? 'border-amber-100'
                        : 'border-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                    {prod.imagen_url ? (
                      <img
                        src={`${prod.imagen_url}?width=150&quality=60`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        alt={prod.nombre}
                      />
                    ) : (
                      <Package
                        size={20}
                        className="m-auto mt-5 text-slate-200"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {!esActivo && (
                      <span className="text-[8px] font-black bg-slate-700 text-white px-2 py-0.5 rounded-md uppercase mb-1 inline-block">
                        Archivado
                      </span>
                    )}
                    <div className="flex items-center gap-1 mb-1 flex-wrap">
                      {prod.categorias?.nombre && (
                        <span className="text-[8px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md uppercase">
                          {prod.categorias.nombre}
                        </span>
                      )}
                      {tieneReceta && (
                        <span
                          className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${
                            capacidadFab === 0
                              ? 'bg-red-100 text-red-600'
                              : capacidadFab < 5
                                ? 'bg-amber-100 text-amber-600'
                                : 'bg-emerald-100 text-emerald-600'
                          }`}
                        >
                          {capacidadFab === 0
                            ? '⚠ Sin stock'
                            : `✦ ${capacidadFab} fabricables`}
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-slate-800 text-xs uppercase truncate">
                      {prod.nombre}
                    </h3>

                    {prod.descripcion && (
                      <p className="text-[10px] text-slate-400 italic truncate">
                        {prod.descripcion}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-orange-500 font-black text-sm">
                        ${precioNum.toFixed(2)}
                      </p>
                      <span
                        className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                          esStockCritico
                            ? 'bg-red-500 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        Stock: {stockNum}{' '}
                        {(prod.unidad_medida || 'UDS').slice(0, 3)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {/* Receta */}
                    <button
                      onClick={() => setProductoParaReceta(prod)}
                      className={`p-2 rounded-xl transition-all shadow-sm ${
                        tieneReceta
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                      }`}
                      title={tieneReceta ? 'Ver/Editar Receta' : 'Crear Receta'}
                    >
                      <ChefHat size={14} />
                    </button>

                    {/* Editar */}
                    <button
                      onClick={() => prepararEdicion(prod)}
                      className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-orange-500 hover:bg-orange-50 transition-all shadow-sm"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>

                    {/* Archivar / Reactivar */}
                    <button
                      onClick={() =>
                        cambiarEstadoProducto(prod.id, prod.activo)
                      }
                      className={`p-2 rounded-xl transition-all shadow-sm ${
                        esActivo
                          ? 'bg-red-50 text-red-400 hover:bg-red-500 hover:text-white'
                          : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                      }`}
                      title={esActivo ? 'Archivar' : 'Reactivar'}
                    >
                      {esActivo ? (
                        <Trash2 size={14} />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {tieneMas && (
          <div className="flex justify-center pb-10">
            <button
              onClick={() => empresaId && obtenerProductos(empresaId)}
              disabled={cargandoMas}
              className="px-10 py-4 bg-white border-2 border-slate-200 rounded-full font-black uppercase text-[10px] tracking-widest hover:border-orange-500 hover:text-orange-500 transition-all flex items-center gap-3 disabled:opacity-50"
            >
              {cargandoMas ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> Cargando...
                </>
              ) : (
                'Cargar más productos'
              )}
            </button>
          </div>
        )}
      </div>

      {/* MODAL RECETA */}
      {productoParaReceta && (
        <ModalReceta
          producto={productoParaReceta}
          productos={productos}
          empresaId={empresaId}
          supabase={supabase}
          onClose={(guardado: boolean) => {
            setProductoParaReceta(null);
            if (guardado && empresaId) {
              mostrarToast('✅ Receta guardada');
              obtenerProductos(empresaId, true);
            }
          }}
        />
      )}
    </main>
  );
}
