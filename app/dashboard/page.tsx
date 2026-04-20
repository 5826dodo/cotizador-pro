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
  AlertTriangle,
  Copy,
  Zap,
  Layers,
  ShoppingBag,
  Plus,
  Building2,
  Lightbulb,
  Users,
  Receipt,
  TrendingUp,
  DollarSign,
  Target,
  Info,
  ChevronDown,
  ChevronUp,
  Settings,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────
interface Categoria {
  id: string;
  nombre: string;
  empresa_id: string;
}

interface GastoFijo {
  id: string;
  nombre: string;
  monto: number;
  categoria: 'personal' | 'servicios' | 'alquiler' | 'impuestos' | 'otros';
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
  unidades_mes?: number; // estimado mensual de producción
  margen_objetivo?: number; // % margen deseado
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
const ITEMS_POR_PAGINA = 50; // cargamos más para no perder productos al inicio

const CATEGORIAS_GASTO = [
  {
    value: 'personal',
    label: 'Personal / Sueldos',
    icon: Users,
    color: 'blue',
  },
  {
    value: 'servicios',
    label: 'Servicios (Luz, Agua, Internet)',
    icon: Lightbulb,
    color: 'yellow',
  },
  {
    value: 'alquiler',
    label: 'Alquiler / Local',
    icon: Building2,
    color: 'purple',
  },
  {
    value: 'impuestos',
    label: 'Impuestos / Tasas',
    icon: Receipt,
    color: 'red',
  },
  { value: 'otros', label: 'Otros gastos', icon: Settings, color: 'slate' },
] as const;

// ─────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────
const factorConversion = (base: string, receta: string) => {
  if (base === 'KILOS' && receta === 'GRAMOS') return 1000;
  if (base === 'LITROS' && receta === 'ML') return 1000;
  return 1;
};

const costoPorUnidad = (ing: Ingrediente) =>
  (ing.costo / factorConversion(ing.unidadBase, ing.unidadReceta)) *
  ing.cantidad;

const stockEnReceta = (ing: Ingrediente) =>
  ing.stockDisponible * factorConversion(ing.unidadBase, ing.unidadReceta);

const unidadesFabricables = (ings: Ingrediente[]) => {
  if (ings.length === 0) return 0;
  return Math.min(
    ...ings.map((i) =>
      i.cantidad <= 0 ? Infinity : Math.floor(stockEnReceta(i) / i.cantidad),
    ),
  );
};

// Precio sugerido con margen objetivo: precio = costo / (1 - margen/100)
const precioConMargen = (costo: number, margen: number) =>
  margen >= 100 ? 0 : costo / (1 - margen / 100);

// Color según margen
const colorMargen = (m: number) =>
  m < 20 ? 'text-red-500' : m < 35 ? 'text-amber-500' : 'text-emerald-500';

// ─────────────────────────────────────────────────────────────
// MODAL GASTOS FIJOS
// ─────────────────────────────────────────────────────────────
function ModalGastos({
  empresaId,
  supabase,
  onClose,
}: {
  empresaId: string;
  supabase: any;
  onClose: () => void;
}) {
  const [gastos, setGastos] = useState<GastoFijo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevaCat, setNuevaCat] = useState<GastoFijo['categoria']>('personal');

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('gastos_fijos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('categoria');
      setGastos(data || []);
      setCargando(false);
    };
    cargar();
  }, [empresaId, supabase]);

  const agregarGasto = async () => {
    if (!nuevoNombre.trim() || !nuevoMonto) return;
    setGuardando(true);
    const { data, error } = await supabase
      .from('gastos_fijos')
      .insert([
        {
          nombre: nuevoNombre.trim(),
          monto: parseFloat(nuevoMonto),
          categoria: nuevaCat,
          empresa_id: empresaId,
        },
      ])
      .select()
      .single();
    if (!error && data) {
      setGastos((prev) => [...prev, data]);
      setNuevoNombre('');
      setNuevoMonto('');
    }
    setGuardando(false);
  };

  const eliminarGasto = async (id: string) => {
    await supabase.from('gastos_fijos').delete().eq('id', id);
    setGastos((prev) => prev.filter((g) => g.id !== id));
  };

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);

  const catColor = (cat: string) => {
    const c = CATEGORIAS_GASTO.find((x) => x.value === cat);
    const map: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      purple: 'bg-purple-100 text-purple-700',
      red: 'bg-red-100 text-red-700',
      slate: 'bg-slate-100 text-slate-700',
    };
    return map[c?.color || 'slate'];
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-xl">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="font-black text-lg uppercase tracking-tight">
                Gastos Fijos Mensuales
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Se distribuyen entre todos los productos según unidades
                estimadas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full"
          >
            <X size={22} />
          </button>
        </div>

        {/* Total */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Total Gastos / Mes
          </p>
          <p className="text-2xl font-black text-slate-800">
            ${totalGastos.toFixed(2)}
          </p>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2 min-h-0">
          {cargando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          ) : gastos.length === 0 ? (
            <div className="text-center py-8">
              <Building2 size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-xs font-black text-slate-300 uppercase">
                Sin gastos registrados
              </p>
            </div>
          ) : (
            gastos.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${catColor(g.categoria)}`}
                    >
                      {CATEGORIAS_GASTO.find((x) => x.value === g.categoria)
                        ?.label || g.categoria}
                    </span>
                  </div>
                  <p className="font-black text-xs text-slate-700 uppercase">
                    {g.nombre}
                  </p>
                </div>
                <p className="font-black text-slate-800 text-sm">
                  ${g.monto.toFixed(2)}/mes
                </p>
                <button
                  onClick={() => eliminarGasto(g.id)}
                  className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Agregar */}
        <div className="p-6 border-t border-slate-100 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Agregar Gasto
          </p>
          <div className="flex gap-3 flex-wrap">
            <select
              value={nuevaCat}
              onChange={(e) =>
                setNuevaCat(e.target.value as GastoFijo['categoria'])
              }
              className="bg-slate-100 p-3 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-blue-500"
            >
              {CATEGORIAS_GASTO.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              placeholder="Descripción (ej: Sueldo Juan)"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="flex-1 min-w-32 bg-slate-100 p-3 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Monto/mes"
              value={nuevoMonto}
              onChange={(e) => setNuevoMonto(e.target.value)}
              className="w-32 bg-slate-100 p-3 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold text-sm"
            />
            <button
              onClick={agregarGasto}
              disabled={guardando}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {guardando ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Plus size={14} />
              )}
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL RECETA — ahora incluye costos fijos y margen
// ─────────────────────────────────────────────────────────────
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
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);
  const [unidadesMes, setUnidadesMes] = useState<number>(
    Number(producto?.unidades_mes) || 100,
  );
  const [margenObj, setMargenObj] = useState<number>(
    Number(producto?.margen_objetivo) || 30,
  );
  const [mostrarDetalleCostos, setMostrarDetalleCostos] = useState(false);

  // Carga receta + gastos fijos en paralelo
  useEffect(() => {
    const cargar = async () => {
      const [recetaRes, gastosRes] = await Promise.all([
        supabase
          .from('recetas')
          .select('*, p_insumo:productos!insumo_id(*)')
          .eq('producto_final_id', producto.id),
        supabase.from('gastos_fijos').select('*').eq('empresa_id', empresaId),
      ]);

      if (recetaRes.data) {
        setIngredientes(
          recetaRes.data.map((r: any) => ({
            id: r.insumo_id,
            nombre: r.p_insumo?.nombre || 'Desconocido',
            costo: Number(r.p_insumo?.costo_compra) || 0,
            cantidad: Number(r.cantidad_requerida) || 0,
            unidadBase: r.p_insumo?.unidad_medida || 'UNIDADES',
            unidadReceta:
              r.unidad_medida_receta || r.p_insumo?.unidad_medida || 'UNIDADES',
            stockDisponible: Number(r.p_insumo?.stock) || 0,
          })),
        );
      }
      if (gastosRes.data) setGastosFijos(gastosRes.data);
      setCargandoReceta(false);
    };
    cargar();
  }, [producto?.id, empresaId, supabase]);

  // ── Costos ──────────────────────────────────────────────
  const costoInsumos = ingredientes.reduce((s, i) => s + costoPorUnidad(i), 0);

  // Total gastos fijos del mes, distribuido proporcionalmente.
  // Necesitamos el total de unidades_mes de todos los productos activos.
  // Para simplificar: usamos unidadesMes de este producto vs suma global
  // (la suma global se calcula al guardar; aquí estimamos con sólo este producto
  //  para la preview interactiva)
  const totalGastosMes = gastosFijos.reduce((s, g) => s + g.monto, 0);

  // Costo fijo asignado a ESTE producto por unidad
  // = (gastos_totales * proporcion_este_producto) / unidades_mes_este
  // Proporcion simple: si sólo hay este producto, absorbe todo.
  // En la práctica se recalcula al guardar con todos los productos.
  const costoFijoUnitario = unidadesMes > 0 ? totalGastosMes / unidadesMes : 0;

  const costoReal = costoInsumos + costoFijoUnitario;
  const precioSugerido = precioConMargen(costoReal, margenObj);
  const margenReal =
    Number(producto?.precio) > 0
      ? ((Number(producto.precio) - costoReal) / Number(producto.precio)) * 100
      : 0;

  const fabMax = unidadesFabricables(ingredientes);
  const gananciaPotencial =
    fabMax === Infinity ? 0 : fabMax * (Number(producto?.precio) - costoReal);

  const limitante =
    ingredientes.length > 0
      ? ingredientes.reduce((min, ing) => {
          const u =
            ing.cantidad > 0
              ? Math.floor(stockEnReceta(ing) / ing.cantidad)
              : Infinity;
          const m =
            min.cantidad > 0
              ? Math.floor(stockEnReceta(min) / min.cantidad)
              : Infinity;
          return u < m ? ing : min;
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

      // Guardar unidades_mes y margen_objetivo en el producto
      await supabase
        .from('productos')
        .update({ unidades_mes: unidadesMes, margen_objetivo: margenObj })
        .eq('id', producto.id);

      onClose(true);
    } catch {
      alert('Error al guardar receta');
    } finally {
      setCargando(false);
    }
  };

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
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[99999] flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Contenedor: Ajustado para ocupar casi todo el alto en móvil (92vh) */}
      <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-4xl h-[92vh] md:h-auto md:max-h-[95vh] shadow-2xl flex flex-col overflow-hidden">
        {/* 1. Header (Estatura fija) */}
        <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-xl hidden sm:block">
              <ChefHat size={20} />
            </div>
            <div>
              <h2 className="font-black text-sm md:text-lg uppercase tracking-tight truncate max-w-[200px] md:max-w-none">
                Receta: {producto?.nombre}
              </h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                Costeo Proporcional
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

        {/* 2. Paneles de Configuración (Scrollable solo si es necesario, pero mantenemos fuera del principal) */}
        <div className="overflow-y-auto max-h-[35vh] md:max-h-none flex-shrink-0 border-b border-slate-100">
          {/* Panel Unidades/Costos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-slate-50">
            <div className="p-3 border-r border-slate-100">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">
                Uds/Mes
              </p>
              <input
                type="number"
                value={unidadesMes}
                onChange={(e) => setUnidadesMes(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-100 p-2 rounded-lg text-center font-black text-sm outline-none focus:ring-2 ring-orange-500"
              />
            </div>
            <div className="p-3 border-r border-slate-100 text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">
                Insumos
              </p>
              <p className="text-sm font-black text-slate-700">
                ${costoInsumos.toFixed(2)}
              </p>
            </div>
            <div className="p-3 border-r border-slate-100 text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">
                Fijos/Ud
              </p>
              <p className="text-sm font-black text-blue-600">
                ${costoFijoUnitario.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-slate-900 text-center">
              <p className="text-[8px] font-black text-slate-500 uppercase mb-1">
                Costo Real
              </p>
              <p className="text-sm font-black text-white">
                ${costoReal.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Panel Margen */}
          <div className="p-4 bg-orange-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[9px] font-black uppercase text-slate-500">
                Margen:
              </span>
              <input
                type="range"
                min="1"
                max="90"
                value={margenObj}
                onChange={(e) => setMargenObj(Number(e.target.value))}
                className="flex-1 sm:w-24 accent-orange-500"
              />
              <span className="font-black text-orange-600 text-sm">
                {margenObj}%
              </span>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase">
                  Sugerido
                </p>
                <p className="text-sm font-black text-orange-500">
                  ${precioSugerido.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase">
                  Actual
                </p>
                <p className={`text-sm font-black ${colorMargen(margenReal)}`}>
                  ${Number(producto?.precio).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Buscador (Fijo) */}
        <div className="p-4 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="AGREGAR INSUMO..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-100 p-3 rounded-xl outline-none focus:ring-2 ring-orange-500 font-bold text-xs"
            />
            {busqueda && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border shadow-2xl rounded-xl z-[100] max-h-40 overflow-y-auto">
                {insumosFiltrados.slice(0, 5).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => agregarIngrediente(p)}
                    className="w-full text-left p-3 hover:bg-orange-50 border-b text-xs font-bold flex justify-between"
                  >
                    <span>{p.nombre}</span>
                    <span className="text-orange-500">${p.costo_compra}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. Lista de Ingredientes (EL ÁREA DE SCROLL PRINCIPAL) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-slate-50/50">
          {cargandoReceta ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-orange-500" />
            </div>
          ) : ingredientes.length === 0 ? (
            <div className="text-center py-10 opacity-20 font-black uppercase text-[10px]">
              No hay ingredientes
            </div>
          ) : (
            ingredientes.map((ing) => {
              const cIng = costoPorUnidad(ing);
              const sRec = stockEnReceta(ing);
              const uEste =
                ing.cantidad > 0 ? Math.floor(sRec / ing.cantidad) : Infinity;
              const esLim = uEste === fabMax && uEste < Infinity;

              return (
                <div
                  key={ing.id}
                  className={`p-3 rounded-2xl border bg-white shadow-sm flex flex-col gap-3 ${esLim ? 'border-amber-200' : 'border-slate-100'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-black text-[11px] text-slate-700 uppercase truncate">
                        {ing.nombre}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold">
                        Stock: {sRec.toFixed(1)} {ing.unidadReceta}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setIngredientes(
                          ingredientes.filter((i) => i.id !== ing.id),
                        )
                      }
                      className="text-slate-300 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
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
                        className="w-16 bg-slate-50 border p-1.5 rounded-lg text-center font-black text-xs"
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
                        className="bg-slate-50 border p-1.5 rounded-lg text-[9px] font-black uppercase"
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
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-800">
                        ${cIng.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Footer (Fijo) */}
        <div className="p-4 md:p-6 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
          <div className="flex justify-around w-full sm:w-auto sm:gap-6">
            <div className="text-center">
              <p className="text-[8px] text-slate-400 font-black uppercase">
                Costo Total
              </p>
              <p className="text-lg font-black">${costoReal.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] text-slate-400 font-black uppercase">
                Precio Sug.
              </p>
              <p className="text-lg font-black text-orange-400">
                ${precioSugerido.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={guardarReceta}
            disabled={cargando}
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
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

// ─────────────────────────────────────────────────────────────
// TARJETA DE PRODUCTO
// ─────────────────────────────────────────────────────────────
function TarjetaProducto({
  prod,
  capacidades,
  gastosFijos,
  onEditar,
  onReceta,
  onCambiarEstado,
}: {
  prod: Producto;
  capacidades: Record<string, number>;
  gastosFijos: GastoFijo[];
  onEditar: (p: Producto) => void;
  onReceta: (p: Producto) => void;
  onCambiarEstado: (id: string, activo: boolean) => void;
}) {
  const precioNum = Number(prod.precio) || 0;
  const stockNum = Number(prod.stock) || 0;
  const esActivo = prod.activo !== false;
  const esStockCrit = stockNum <= 5;
  const capFab = capacidades[prod.id];
  const tieneReceta = capFab !== undefined;

  // Costo real (insumos ya calculados en capacidades + gastos fijos)
  // Para la tarjeta mostramos margen si tiene precio y costo guardado
  const costoGuardado = Number(prod.costo_compra) || 0;
  const totalGastos = gastosFijos.reduce((s, g) => s + g.monto, 0);
  const unidMes = Number(prod.unidades_mes) || 100;
  const costoFijoUd = unidMes > 0 ? totalGastos / unidMes : 0;
  const costoReal = costoGuardado + costoFijoUd;
  const margenReal =
    precioNum > 0 ? ((precioNum - costoReal) / precioNum) * 100 : 0;

  return (
    <div
      className={`bg-white p-5 rounded-[2.5rem] shadow-sm border-2 transition-all ${
        !esActivo
          ? 'opacity-50 grayscale border-dashed border-slate-200'
          : tieneReceta && capFab === 0
            ? 'border-red-200'
            : esStockCrit
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
            <Package size={20} className="m-auto mt-5 text-slate-200" />
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
                  capFab === 0
                    ? 'bg-red-100 text-red-600'
                    : capFab < 5
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {capFab === 0 ? '⚠ Sin stock' : `✦ ${capFab} fabricables`}
              </span>
            )}
            {/* Margen real en la tarjeta */}
            {!prod.es_materia_prima && precioNum > 0 && (
              <span
                className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${
                  margenReal < 20
                    ? 'bg-red-100 text-red-600'
                    : margenReal < 35
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {margenReal.toFixed(0)}% margen
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
            {!prod.es_materia_prima && costoReal > 0 && (
              <p className="text-[9px] text-slate-400 font-bold">
                costo: ${costoReal.toFixed(2)}
              </p>
            )}
            <span
              className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${esStockCrit ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}
            >
              Stock: {stockNum} {(prod.unidad_medida || 'UDS').slice(0, 3)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {!prod.es_materia_prima && (
            <button
              onClick={() => onReceta(prod)}
              className={`p-2 rounded-xl transition-all shadow-sm ${tieneReceta ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
              title={tieneReceta ? 'Ver/Editar Receta' : 'Crear Receta'}
            >
              <ChefHat size={14} />
            </button>
          )}
          <button
            onClick={() => onEditar(prod)}
            className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-orange-500 hover:bg-orange-50 transition-all shadow-sm"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onCambiarEstado(prod.id, prod.activo)}
            className={`p-2 rounded-xl transition-all shadow-sm ${esActivo ? 'bg-red-50 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
            title={esActivo ? 'Archivar' : 'Reactivar'}
          >
            {esActivo ? <Trash2 size={14} /> : <RefreshCw size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
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
  const [esMateriaPrima, setEsMateriaPrima] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);

  // Modales
  const [productoParaReceta, setProductoParaReceta] = useState<Producto | null>(
    null,
  );
  const [mostrarGastos, setMostrarGastos] = useState(false);

  // Imagen
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [comprimiendo, setComprimiendo] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  // Datos
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);
  const paginaRef = useRef(0);
  const [tieneMas, setTieneMas] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);

  // UI
  const [toast, setToast] = useState<{
    texto: string;
    tipo: 'ok' | 'error';
  } | null>(null);
  const [capacidades, setCapacidades] = useState<Record<string, number>>({});
  const [tabActivo, setTabActivo] = useState<'venta' | 'insumos'>('venta');

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

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  // ── Cargar capacidades ───────────────────────────────────
  const cargarCapacidades = useCallback(
    async (idEmpresa: string) => {
      const { data: recetas } = await supabase
        .from('recetas')
        .select(
          '*, p_insumo:productos!insumo_id(stock, unidad_medida, costo_compra)',
        )
        .eq('empresa_id', idEmpresa);
      if (!recetas) return;

      const porProd: Record<string, any[]> = {};
      for (const r of recetas) {
        if (!porProd[r.producto_final_id]) porProd[r.producto_final_id] = [];
        porProd[r.producto_final_id].push(r);
      }
      const caps: Record<string, number> = {};
      for (const [id, ings] of Object.entries(porProd)) {
        caps[id] = unidadesFabricables(
          ings.map((r: any) => ({
            id: r.insumo_id,
            nombre: '',
            costo: Number(r.p_insumo?.costo_compra) || 0,
            cantidad: Number(r.cantidad_requerida) || 0,
            unidadBase: r.p_insumo?.unidad_medida || 'UNIDADES',
            unidadReceta:
              r.unidad_medida_receta || r.p_insumo?.unidad_medida || 'UNIDADES',
            stockDisponible: Number(r.p_insumo?.stock) || 0,
          })),
        );
      }
      setCapacidades(caps);
    },
    [supabase],
  );

  // ── Productos — SIN paginación por defecto, carga todos ─
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
        } else {
          setProductos((prev) => [...prev, ...nuevos]);
          paginaRef.current = paginaActual + 1;
        }
        setTieneMas(nuevos.length === ITEMS_POR_PAGINA);
      }
      setCargandoMas(false);
    },
    [supabase],
  );

  // ── Gastos fijos ─────────────────────────────────────────
  const cargarGastos = useCallback(
    async (idEmpresa: string) => {
      const { data } = await supabase
        .from('gastos_fijos')
        .select('*')
        .eq('empresa_id', idEmpresa);
      setGastosFijos(data || []);
    },
    [supabase],
  );

  // ── Init ─────────────────────────────────────────────────
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
          // Carga en paralelo
          await Promise.all([
            obtenerProductos(perfil.empresa_id, true),
            cargarCapacidades(perfil.empresa_id),
            cargarGastos(perfil.empresa_id),
            supabase
              .from('categorias')
              .select('*')
              .eq('empresa_id', perfil.empresa_id)
              .order('nombre')
              .then(({ data: cats }) =>
                setCategorias((cats as Categoria[]) || []),
              ),
          ]);
        }
      }
      setCargando(false);
    };
    iniciar();
  }, [obtenerProductos, cargarCapacidades, cargarGastos, supabase]);

  // ── Imagen ────────────────────────────────────────────────
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('Máximo 15 MB');
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
    } catch {
      setImagenFile(file);
      asignarPreview(URL.createObjectURL(file));
    } finally {
      setComprimiendo(false);
    }
  };

  const subirImagen = async (file: File): Promise<string> => {
    const fileName = `${empresaId}/${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage
      .from('productos')
      .upload(fileName, file, { contentType: 'image/webp', upsert: true });
    if (error) throw error;
    return supabase.storage.from('productos').getPublicUrl(fileName).data
      .publicUrl;
  };

  // ── CRUD ──────────────────────────────────────────────────
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
        es_materia_prima: esMateriaPrima,
      };

      if (editando) {
        await supabase.from('productos').update(payload).eq('id', editando.id);
        mostrarToast('✅ Actualizado');
      } else {
        await supabase.from('productos').insert([payload]);
        mostrarToast(
          esMateriaPrima ? '📦 Insumo registrado' : '🚀 Producto registrado',
        );
      }
      cancelarEdicion();
      obtenerProductos(empresaId, true);
      cargarCapacidades(empresaId);
    } catch (err: any) {
      mostrarToast('Error: ' + err.message, 'error');
    } finally {
      setSubiendoImg(false);
    }
  };

  const cambiarEstado = async (id: string, estadoActual: boolean) => {
    await supabase
      .from('productos')
      .update({ activo: !estadoActual })
      .eq('id', id);
    if (empresaId) {
      obtenerProductos(empresaId, true);
      mostrarToast(estadoActual ? '📦 Archivado' : '✅ Reactivado');
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
    setEsMateriaPrima(prod.es_materia_prima ?? false);
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
    setEsMateriaPrima(false);
    setImagenFile(null);
    asignarPreview(null);
  };

  // ── Separar productos ─────────────────────────────────────
  const productosDeVenta = productos.filter((p) => !p.es_materia_prima);
  const materiasPrimas = productos.filter((p) => p.es_materia_prima);
  const productosMostrados =
    tabActivo === 'venta' ? productosDeVenta : materiasPrimas;

  // ── Resumen gastos para el banner ─────────────────────────
  const totalGastosMes = gastosFijos.reduce((s, g) => s + g.monto, 0);

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
          <div className="flex items-center gap-3 flex-wrap">
            {/* ── NUEVO: Botón gastos fijos con resumen ── */}
            <button
              onClick={() => setMostrarGastos(true)}
              className="flex items-center gap-2 bg-blue-50 text-blue-700 border-2 border-blue-100 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
            >
              <Building2 size={14} />
              Gastos Fijos
              {totalGastosMes > 0 && (
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[8px] font-black">
                  ${totalGastosMes.toFixed(0)}/mes
                </span>
              )}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/catalogo/${empresaId}`,
                );
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

        {/* ── BANNER: si no hay gastos fijos configurados ── */}
        {totalGastosMes === 0 && (
          <button
            onClick={() => setMostrarGastos(true)}
            className="w-full p-5 bg-blue-50 border-2 border-blue-100 rounded-[2rem] flex items-center gap-4 hover:bg-blue-100 transition-all text-left"
          >
            <div className="p-3 bg-blue-500 rounded-2xl flex-shrink-0 text-white">
              <Building2 size={20} />
            </div>
            <div className="flex-1">
              <p className="text-blue-800 text-xs font-black uppercase">
                Configura tus Gastos Fijos Mensuales
              </p>
              <p className="text-blue-600 text-[10px] font-bold mt-0.5">
                Sueldos, luz, alquiler, impuestos… Agrégalos para calcular el{' '}
                <span className="font-black">costo real</span> de cada producto
                y no perder dinero.
              </p>
            </div>
            <span className="text-[10px] font-black text-blue-500 bg-blue-100 px-4 py-2 rounded-2xl uppercase flex-shrink-0">
              Configurar →
            </span>
          </button>
        )}

        {/* ── BANNER: resumen gastos si ya están configurados ── */}
        {totalGastosMes > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CATEGORIAS_GASTO.map((cat) => {
              const total = gastosFijos
                .filter((g) => g.categoria === cat.value)
                .reduce((s, g) => s + g.monto, 0);
              if (total === 0) return null;
              const colorMap: Record<string, string> = {
                blue: 'bg-blue-50 border-blue-100 text-blue-700',
                yellow: 'bg-yellow-50 border-yellow-100 text-yellow-700',
                purple: 'bg-purple-50 border-purple-100 text-purple-700',
                red: 'bg-red-50 border-red-100 text-red-700',
                slate: 'bg-slate-50 border-slate-200 text-slate-700',
              };
              const Icon = cat.icon;
              return (
                <div
                  key={cat.value}
                  className={`p-4 rounded-2xl border-2 ${colorMap[cat.color]}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={13} />
                    <p className="text-[8px] font-black uppercase">
                      {cat.label}
                    </p>
                  </div>
                  <p className="text-lg font-black">
                    ${total.toFixed(2)}
                    <span className="text-[9px] font-bold">/mes</span>
                  </p>
                </div>
              );
            })}
            <button
              onClick={() => setMostrarGastos(true)}
              className="p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all flex flex-col items-center justify-center gap-1"
            >
              <Settings size={16} />
              <p className="text-[8px] font-black uppercase">Editar Gastos</p>
            </button>
          </div>
        )}

        {/* FORMULARIO */}
        <section className="bg-white p-8 rounded-[3rem] shadow-xl border border-white">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {editando ? '✏️ Editando' : '➕ Nuevo'}{' '}
              {esMateriaPrima ? 'insumo / materia prima' : 'producto de venta'}
            </span>
          </div>

          {/* Toggle tipo */}
          <div className="flex items-center gap-2 mb-6 p-1 bg-slate-100 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setEsMateriaPrima(false)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!esMateriaPrima ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ShoppingBag size={13} /> Producto de Venta
            </button>
            <button
              type="button"
              onClick={() => setEsMateriaPrima(true)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${esMateriaPrima ? 'bg-violet-600 shadow text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Layers size={13} /> Insumo / Materia Prima
            </button>
          </div>

          {esMateriaPrima ? (
            <div className="mb-5 p-3 bg-violet-50 border border-violet-100 rounded-2xl flex items-center gap-3">
              <Layers size={14} className="text-violet-500 flex-shrink-0" />
              <p className="text-[10px] font-bold text-violet-700">
                No aparecerá en el catálogo. Solo se usa como insumo en recetas.
              </p>
            </div>
          ) : (
            <div className="mb-5 p-3 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-3">
              <ShoppingBag
                size={14}
                className="text-orange-500 flex-shrink-0"
              />
              <p className="text-[10px] font-bold text-orange-700">
                Aparecerá en el catálogo. Puedes asignarle una receta con
                insumos y gastos fijos.
              </p>
            </div>
          )}

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
                  {esMateriaPrima ? <Layers size={28} /> : <Camera size={32} />}
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

            {/* Campos */}
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                  {esMateriaPrima ? 'Nombre del Insumo' : 'Nombre del Producto'}
                </label>
                <input
                  placeholder={
                    esMateriaPrima
                      ? 'Ej: Harina, Tela azul...'
                      : 'Ej: Hamburguesa con Queso'
                  }
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold placeholder:text-slate-300 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                  Descripción / Notas
                </label>
                <textarea
                  placeholder={
                    esMateriaPrima
                      ? 'Proveedor, SKU...'
                      : 'Talla, Color, Especificaciones...'
                  }
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold placeholder:text-slate-300 transition-all resize-none"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {!esMateriaPrima && (
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
                )}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                    Costo Unitario
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
                {!esMateriaPrima && (
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
                )}
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
                className={`w-full py-4 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${esMateriaPrima ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}
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
                  `✏️ Actualizar ${esMateriaPrima ? 'Insumo' : 'Producto'}`
                ) : (
                  `🚀 Registrar ${esMateriaPrima ? 'Insumo' : 'Producto'}`
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

        {/* TIP */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 rounded-[2rem] flex items-center gap-4">
          <div className="p-3 bg-orange-500/20 rounded-2xl flex-shrink-0">
            <Zap size={20} className="text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="text-white text-xs font-black uppercase">
              Flujo recomendado
            </p>
            <p className="text-slate-400 text-[10px] font-bold mt-0.5">
              <span className="text-blue-400 font-black">1. Gastos Fijos</span>{' '}
              →{' '}
              <span className="text-violet-400 font-black">
                2. Registra Insumos
              </span>{' '}
              →{' '}
              <span className="text-orange-400 font-black">
                3. Crea Productos de Venta
              </span>{' '}
              →{' '}
              <span className="text-emerald-400 font-black">
                4. Asigna Receta + Margen
              </span>
              . El sistema calcula el precio de venta real automáticamente.
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTabActivo('venta')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${tabActivo === 'venta' ? 'bg-white shadow-md text-slate-800' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}
          >
            <ShoppingBag size={13} /> Productos de Venta
            <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[8px] font-black">
              {productosDeVenta.length}
            </span>
          </button>
          <button
            onClick={() => setTabActivo('insumos')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${tabActivo === 'insumos' ? 'bg-white shadow-md text-slate-800' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}
          >
            <Layers size={13} /> Insumos / Materias Primas
            <span className="bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full text-[8px] font-black">
              {materiasPrimas.length}
            </span>
          </button>
        </div>

        {tabActivo === 'insumos' && (
          <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl flex items-center gap-3">
            <Layers size={16} className="text-violet-500 flex-shrink-0" />
            <p className="text-[10px] font-bold text-violet-700">
              Solo para uso interno. No aparecen en el catálogo público. Son los
              ingredientes que usas para fabricar tus productos.
            </p>
          </div>
        )}

        {/* LISTADO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productosMostrados.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              {tabActivo === 'venta' ? (
                <>
                  <ShoppingBag
                    size={40}
                    className="mx-auto text-slate-200 mb-3"
                  />
                  <p className="text-xs font-black text-slate-300 uppercase">
                    Sin productos de venta aún
                  </p>
                </>
              ) : (
                <>
                  <Layers size={40} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-xs font-black text-slate-300 uppercase">
                    Sin insumos registrados
                  </p>
                </>
              )}
            </div>
          ) : (
            productosMostrados.map((prod) => (
              <TarjetaProducto
                key={prod.id}
                prod={prod}
                capacidades={capacidades}
                gastosFijos={gastosFijos}
                onEditar={prepararEdicion}
                onReceta={setProductoParaReceta}
                onCambiarEstado={cambiarEstado}
              />
            ))
          )}
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
              cargarCapacidades(empresaId);
            }
          }}
        />
      )}

      {/* MODAL GASTOS FIJOS */}
      {mostrarGastos && empresaId && (
        <ModalGastos
          empresaId={empresaId}
          supabase={supabase}
          onClose={() => {
            setMostrarGastos(false);
            if (empresaId) cargarGastos(empresaId);
          }}
        />
      )}
    </main>
  );
}
