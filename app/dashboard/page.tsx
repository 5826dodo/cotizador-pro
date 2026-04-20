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
  ChevronDown,
  ChevronUp,
  Settings,
  Calendar,
  CalendarDays,
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
  margen_objetivo?: number;
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
const ITEMS_POR_PAGINA = 50;

const CATEGORIAS_GASTO = [
  {
    value: 'personal',
    label: 'Personal / Sueldos',
    icon: Users,
    color: 'blue',
  },
  {
    value: 'servicios',
    label: 'Servicios (Luz, Agua, etc.)',
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
const calcUnidadesFabricables = (ings: Ingrediente[]) => {
  if (ings.length === 0) return 0;
  return Math.min(
    ...ings.map((i) =>
      i.cantidad <= 0 ? Infinity : Math.floor(stockEnReceta(i) / i.cantidad),
    ),
  );
};
const precioConMargen = (costo: number, margen: number) =>
  margen >= 100 ? 0 : costo / (1 - margen / 100);
const colorMargen = (m: number) =>
  m < 20 ? 'text-red-500' : m < 35 ? 'text-amber-500' : 'text-emerald-500';
const bgColorMargen = (m: number) =>
  m < 20
    ? 'bg-red-100 text-red-600'
    : m < 35
      ? 'bg-amber-100 text-amber-600'
      : 'bg-emerald-100 text-emerald-600';

// ─────────────────────────────────────────────────────────────
// DISTRIBUCIÓN AUTOMÁTICA E IGUAL
// costoFijoUnitario = gastos_totales / cantidad_productos_activos_de_venta
// Cada producto absorbe la misma fracción.
// ─────────────────────────────────────────────────────────────
const calcCostoFijoUnitario = (
  totalGastosMes: number,
  totalProductosVentaActivos: number,
) => {
  if (totalProductosVentaActivos === 0) return 0;
  return totalGastosMes / totalProductosVentaActivos;
};

// ─────────────────────────────────────────────────────────────
// MODAL GASTOS FIJOS — vista mensual + semanal
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
  const [periodoInput, setPeriodoInput] = useState<'mensual' | 'semanal'>(
    'mensual',
  );
  const [vistaTab, setVistaTab] = useState<'mensual' | 'semanal'>('mensual');

  useEffect(() => {
    supabase
      .from('gastos_fijos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('categoria')
      .then(({ data }: any) => {
        setGastos(data || []);
        setCargando(false);
      });
  }, [empresaId, supabase]);

  const agregarGasto = async () => {
    if (!nuevoNombre.trim() || !nuevoMonto) return;
    setGuardando(true);
    // Si el input es semanal, convertimos a mensual (×4.33) para guardar siempre en mensual
    const montoMensual =
      periodoInput === 'semanal'
        ? parseFloat(nuevoMonto) * 4.33
        : parseFloat(nuevoMonto);

    const { data, error } = await supabase
      .from('gastos_fijos')
      .insert([
        {
          nombre: nuevoNombre.trim(),
          monto: montoMensual,
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

  const totalMensual = gastos.reduce((s, g) => s + g.monto, 0);
  const totalSemanal = totalMensual / 4.33;

  // Monto a mostrar según tab
  const montoDisplay = (montoMensual: number) =>
    vistaTab === 'semanal' ? montoMensual / 4.33 : montoMensual;

  const catColorClass = (cat: string) => {
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
                Gastos Fijos
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Se reparten igual entre todos los productos activos de venta
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

        {/* Tabs mensual/semanal */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 p-1 bg-white rounded-2xl shadow-sm border border-slate-100">
            <button
              onClick={() => setVistaTab('mensual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${vistaTab === 'mensual' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Calendar size={12} /> Mensual
            </button>
            <button
              onClick={() => setVistaTab('semanal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${vistaTab === 'semanal' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <CalendarDays size={12} /> Semanal
            </button>
          </div>

          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-400 uppercase">
                Total / Mes
              </p>
              <p className="text-lg font-black text-slate-800">
                ${totalMensual.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-400 uppercase">
                Total / Semana
              </p>
              <p className="text-lg font-black text-blue-600">
                ${totalSemanal.toFixed(2)}
              </p>
            </div>
          </div>
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
              <p className="text-[10px] text-slate-300 font-bold mt-1">
                Agrega sueldos, servicios, alquiler, etc.
              </p>
            </div>
          ) : (
            <>
              {/* Agrupado por categoría */}
              {CATEGORIAS_GASTO.map((cat) => {
                const del = gastos.filter((g) => g.categoria === cat.value);
                if (del.length === 0) return null;
                const subtotal = del.reduce((s, g) => s + g.monto, 0);
                return (
                  <div key={cat.value} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${catColorClass(cat.value)}`}
                      >
                        {cat.label}
                      </span>
                      <span className="text-[9px] font-black text-slate-400 uppercase">
                        ${montoDisplay(subtotal).toFixed(2)}
                        {vistaTab === 'semanal' ? '/sem' : '/mes'}
                      </span>
                    </div>
                    {del.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 mb-1.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-xs text-slate-700 uppercase">
                            {g.nombre}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold">
                            ${g.monto.toFixed(2)}/mes · $
                            {(g.monto / 4.33).toFixed(2)}/sem
                          </p>
                        </div>
                        <p className="font-black text-slate-800 text-sm whitespace-nowrap">
                          ${montoDisplay(g.monto).toFixed(2)}
                          <span className="text-[9px] text-slate-400 font-bold ml-1">
                            {vistaTab === 'semanal' ? '/sem' : '/mes'}
                          </span>
                        </p>
                        <button
                          onClick={() => eliminarGasto(g.id)}
                          className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Agregar */}
        <div className="p-6 border-t border-slate-100 space-y-3 bg-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Agregar Gasto
            </p>
            {/* Toggle si el monto ingresado es mensual o semanal */}
            <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200">
              <button
                onClick={() => setPeriodoInput('mensual')}
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${periodoInput === 'mensual' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}
              >
                Mensual
              </button>
              <button
                onClick={() => setPeriodoInput('semanal')}
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${periodoInput === 'semanal' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}
              >
                Semanal
              </button>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <select
              value={nuevaCat}
              onChange={(e) =>
                setNuevaCat(e.target.value as GastoFijo['categoria'])
              }
              className="bg-white border-2 border-slate-200 p-3 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-500"
            >
              {CATEGORIAS_GASTO.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              placeholder="Descripción (ej: Sueldo Juan, Luz)"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="flex-1 min-w-36 bg-white border-2 border-slate-200 p-3 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm"
            />
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder={
                  periodoInput === 'semanal' ? 'Monto/semana' : 'Monto/mes'
                }
                value={nuevoMonto}
                onChange={(e) => setNuevoMonto(e.target.value)}
                className="w-36 bg-white border-2 border-slate-200 p-3 pr-10 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">
                {periodoInput === 'semanal' ? '/sem' : '/mes'}
              </span>
            </div>
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
          {periodoInput === 'semanal' && nuevoMonto && (
            <p className="text-[9px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl inline-block">
              = ${(parseFloat(nuevoMonto) * 4.33).toFixed(2)}/mes (×4.33
              semanas)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL RECETA
// ─────────────────────────────────────────────────────────────
function ModalReceta({
  producto,
  productos,
  onClose,
  empresaId,
  supabase,
  totalProductosVentaActivos,
}: any) {
  const [busqueda, setBusqueda] = useState('');
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoReceta, setCargandoReceta] = useState(true);
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);
  const [margenObj, setMargenObj] = useState<number>(
    Number(producto?.margen_objetivo) || 30,
  );
  const [mostrarDesglose, setMostrarDesglose] = useState(false);
  const [vistaGastos, setVistaGastos] = useState<'mensual' | 'semanal'>(
    'mensual',
  );

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

  // ── Cálculos ──────────────────────────────────────────────
  const costoInsumos = ingredientes.reduce((s, i) => s + costoPorUnidad(i), 0);
  const totalGastosMes = gastosFijos.reduce((s, g) => s + g.monto, 0);
  // Distribución automática e igual entre todos los productos activos de venta
  const costoFijoUnitario = calcCostoFijoUnitario(
    totalGastosMes,
    totalProductosVentaActivos || 1,
  );
  const costoFijoSemanal = costoFijoUnitario / 4.33; // referencia visual

  const costoReal = costoInsumos + costoFijoUnitario;
  const precioSugerido = precioConMargen(costoReal, margenObj);
  const precioActual = Number(producto?.precio) || 0;
  const margenReal =
    precioActual > 0 ? ((precioActual - costoReal) / precioActual) * 100 : 0;
  const gananciaUd = precioActual - costoReal;
  const fabMax = calcUnidadesFabricables(ingredientes);
  const gananciaPotencial = fabMax === Infinity ? 0 : fabMax * gananciaUd;

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
      if (ingredientes.length > 0) {
        await supabase.from('recetas').insert(
          ingredientes.map((i) => ({
            producto_final_id: producto.id,
            insumo_id: i.id,
            cantidad_requerida: i.cantidad,
            unidad_medida_receta: i.unidadReceta,
            empresa_id: empresaId,
          })),
        );
      }
      await supabase
        .from('productos')
        .update({ margen_objetivo: margenObj })
        .eq('id', producto.id);
      onClose(true);
    } catch {
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
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-xl">
              <ChefHat size={20} />
            </div>
            <div>
              <h2 className="font-black text-lg uppercase tracking-tight">
                Receta: {producto?.nombre}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Gastos fijos distribuidos en {totalProductosVentaActivos}{' '}
                productos activos
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

        {/* ── Fila de costos ── */}
        <div className="grid grid-cols-4 border-b border-slate-100">
          <div className="p-4 text-center border-r border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Costo Insumos
            </p>
            <p className="text-xl font-black text-slate-700">
              ${costoInsumos.toFixed(2)}
            </p>
            <p className="text-[8px] text-slate-400 font-bold">ingredientes</p>
          </div>
          <div className="p-4 text-center border-r border-slate-100">
            <div className="flex items-center justify-center gap-1 mb-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Gastos Fijos / Ud
              </p>
            </div>
            <p className="text-xl font-black text-blue-600">
              ${costoFijoUnitario.toFixed(2)}
            </p>
            <p className="text-[8px] text-slate-400 font-bold">
              ${totalGastosMes.toFixed(0)}/mes ÷ {totalProductosVentaActivos}{' '}
              productos
            </p>
          </div>
          <div className="p-4 text-center border-r border-slate-100 bg-slate-900">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Costo Real / Ud
            </p>
            <p className="text-xl font-black text-white">
              ${costoReal.toFixed(2)}
            </p>
            <p className="text-[8px] text-slate-500 font-bold">
              insumos + fijos
            </p>
          </div>
          <div className="p-4 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Fabricables
            </p>
            <p
              className={`text-xl font-black ${fabMax === 0 ? 'text-red-500' : fabMax < 5 ? 'text-amber-500' : 'text-emerald-500'}`}
            >
              {fabMax === Infinity ? '∞' : fabMax}
            </p>
            <p className="text-[8px] text-slate-400 font-bold">unidades</p>
          </div>
        </div>

        {/* ── Calculadora de precio con margen ── */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            {/* Slider margen */}
            <div className="flex-1 min-w-48">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">
                Margen Objetivo → Precio Sugerido
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="90"
                  step="1"
                  value={margenObj}
                  onChange={(e) => setMargenObj(Number(e.target.value))}
                  className="flex-1 accent-orange-500"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={margenObj}
                    onChange={(e) =>
                      setMargenObj(
                        Math.min(90, Math.max(1, Number(e.target.value))),
                      )
                    }
                    className="w-14 bg-white border-2 border-orange-200 p-2 rounded-xl text-center font-black text-sm focus:border-orange-500 outline-none"
                  />
                  <span className="font-black text-orange-500 text-sm">%</span>
                </div>
              </div>
              {/* Barra visual de composición del precio */}
              <div className="mt-3 h-2 rounded-full overflow-hidden bg-slate-200 flex">
                {costoReal > 0 && precioSugerido > 0 && (
                  <>
                    <div
                      className="h-full bg-violet-400 transition-all"
                      style={{
                        width: `${(costoInsumos / precioSugerido) * 100}%`,
                      }}
                      title="Insumos"
                    />
                    <div
                      className="h-full bg-blue-400 transition-all"
                      style={{
                        width: `${(costoFijoUnitario / precioSugerido) * 100}%`,
                      }}
                      title="Gastos fijos"
                    />
                    <div
                      className="h-full bg-emerald-400 transition-all"
                      style={{ width: `${(margenObj / 100) * 100}%` }}
                      title="Ganancia"
                    />
                  </>
                )}
              </div>
              <div className="flex gap-3 mt-1">
                <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
                  Insumos
                </span>
                <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                  Gastos fijos
                </span>
                <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  Ganancia
                </span>
              </div>
            </div>

            {/* Resultados */}
            <div className="flex items-center gap-5 flex-wrap">
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase">
                  Precio Sugerido
                </p>
                <p className="text-3xl font-black text-orange-500">
                  ${precioSugerido.toFixed(2)}
                </p>
                <p className="text-[8px] text-slate-400 font-bold">
                  con {margenObj}% margen
                </p>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase">
                  Precio Actual
                </p>
                <p className={`text-2xl font-black ${colorMargen(margenReal)}`}>
                  ${precioActual.toFixed(2)}
                </p>
                <p
                  className={`text-[8px] font-black ${colorMargen(margenReal)}`}
                >
                  {margenReal.toFixed(1)}% margen real
                </p>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase">
                  Ganancia / Ud
                </p>
                <p
                  className={`text-2xl font-black ${gananciaUd > 0 ? 'text-emerald-600' : 'text-red-500'}`}
                >
                  ${gananciaUd.toFixed(2)}
                </p>
                <p className="text-[8px] text-slate-400 font-bold">
                  con precio actual
                </p>
              </div>
            </div>
          </div>

          {/* Desglose expandible */}
          <button
            onClick={() => setMostrarDesglose((v) => !v)}
            className="mt-3 flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-orange-500 uppercase tracking-widest transition-colors"
          >
            {mostrarDesglose ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
            Desglose completo
          </button>

          {mostrarDesglose && (
            <div className="mt-3 p-4 bg-white rounded-2xl border border-orange-100 space-y-2">
              {/* Toggle mensual/semanal dentro del desglose */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-black text-slate-400 uppercase">
                  Desglose de costos por unidad
                </p>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                  <button
                    onClick={() => setVistaGastos('mensual')}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${vistaGastos === 'mensual' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                  >
                    Mensual
                  </button>
                  <button
                    onClick={() => setVistaGastos('semanal')}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${vistaGastos === 'semanal' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                  >
                    Semanal
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">
                    Insumos
                  </p>
                  <p className="font-black text-violet-600">
                    ${costoInsumos.toFixed(2)}
                  </p>
                  <p className="text-[8px] text-slate-400">
                    {costoReal > 0
                      ? ((costoInsumos / costoReal) * 100).toFixed(0)
                      : 0}
                    % del costo
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">
                    Gastos Fijos
                  </p>
                  <p className="font-black text-blue-600">
                    $
                    {vistaGastos === 'semanal'
                      ? (costoFijoUnitario / 4.33).toFixed(2)
                      : costoFijoUnitario.toFixed(2)}
                    <span className="text-[8px] font-bold text-slate-400 ml-0.5">
                      {vistaGastos === 'semanal' ? '/sem' : '/mes'}
                    </span>
                  </p>
                  <p className="text-[8px] text-slate-400">
                    {costoReal > 0
                      ? ((costoFijoUnitario / costoReal) * 100).toFixed(0)
                      : 0}
                    % del costo
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">
                    Costo Real
                  </p>
                  <p className="font-black text-slate-800">
                    ${costoReal.toFixed(2)}
                  </p>
                  <p className="text-[8px] text-slate-400">100% del costo</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">
                    Ganancia x Ud
                  </p>
                  <p
                    className={`font-black ${gananciaUd > 0 ? 'text-emerald-600' : 'text-red-500'}`}
                  >
                    ${gananciaUd.toFixed(2)}
                  </p>
                  <p className="text-[8px] text-slate-400">precio actual</p>
                </div>
              </div>
              {totalGastosMes > 0 && (
                <div className="mt-2 p-3 bg-blue-50 rounded-xl">
                  <p className="text-[9px] font-bold text-blue-700">
                    💡{' '}
                    <span className="font-black">
                      ${totalGastosMes.toFixed(2)}/mes
                    </span>{' '}
                    en gastos fijos ÷{' '}
                    <span className="font-black">
                      {totalProductosVentaActivos} productos
                    </span>{' '}
                    activos ={' '}
                    <span className="font-black">
                      ${costoFijoUnitario.toFixed(2)}/ud
                    </span>{' '}
                    que absorbe este producto.
                    {vistaGastos === 'semanal' && (
                      <>
                        {' '}
                        Semanal:{' '}
                        <span className="font-black">
                          ${(totalGastosMes / 4.33).toFixed(2)}
                        </span>{' '}
                        ÷ {totalProductosVentaActivos} ={' '}
                        <span className="font-black">
                          ${(costoFijoUnitario / 4.33).toFixed(2)}/ud
                        </span>
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alerta limitante */}
        {!cargandoReceta && limitante && fabMax < 10 && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs font-bold text-amber-700">
              <span className="font-black">Insumo limitante:</span>{' '}
              <span className="text-amber-600">{limitante.nombre}</span>
              {' — '}
              {stockEnReceta(limitante).toFixed(1)}{' '}
              {limitante.unidadReceta.toLowerCase()} disponibles.
              {fabMax === 0 && ' ¡Stock agotado!'}
            </p>
          </div>
        )}

        {/* Buscador */}
        <div className="p-6 pb-2 space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            Agregar Insumo a la Receta
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar insumo o materia prima..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-100 border-2 border-transparent p-4 rounded-2xl outline-none focus:border-orange-500 font-bold text-sm transition-all"
            />
            {busqueda && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border shadow-2xl rounded-2xl overflow-hidden z-10">
                {insumosFiltrados.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400 font-bold text-center">
                    Sin resultados
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
                          <div className="flex items-center gap-2">
                            <p className="font-black text-xs uppercase text-slate-800">
                              {p.nombre}
                            </p>
                            {p.es_materia_prima && (
                              <span className="text-[8px] font-black bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full uppercase">
                                Insumo
                              </span>
                            )}
                          </div>
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

        {/* Lista ingredientes */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-2 min-h-0">
          {cargandoReceta ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-orange-500" size={24} />
            </div>
          ) : ingredientes.length === 0 ? (
            <div className="text-center py-6">
              <FlaskConical size={36} className="mx-auto text-slate-200 mb-3" />
              <p className="text-xs font-black text-slate-300 uppercase">
                Sin ingredientes aún
              </p>
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
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${esLim && fabMax < 10 ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-xs text-slate-700 uppercase truncate">
                        {ing.nombre}
                      </p>
                      {esLim && fabMax < 10 && (
                        <span className="text-[8px] font-black bg-amber-400 text-white px-2 py-0.5 rounded-full uppercase flex-shrink-0">
                          Limitante
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      Stock: {ing.stockDisponible} {ing.unidadBase} →{' '}
                      {sRec.toFixed(1)} {ing.unidadReceta}
                    </p>
                  </div>
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
                  <div className="text-right w-20 flex-shrink-0">
                    <p className="text-[8px] font-black text-slate-400 uppercase">
                      Costo
                    </p>
                    <p className="text-sm font-black text-slate-700">
                      ${cIng.toFixed(2)}
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold">
                      {uEste === Infinity ? '∞' : uEste} uds
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
          <div className="flex gap-4 flex-wrap">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">
                Insumos
              </p>
              <p className="text-lg font-black text-slate-300">
                ${costoInsumos.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">
                + Fijos
              </p>
              <p className="text-lg font-black text-blue-400">
                ${costoFijoUnitario.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">
                = Costo Real
              </p>
              <p className="text-lg font-black text-white">
                ${costoReal.toFixed(2)}
              </p>
            </div>
            <div className="border-l border-slate-700 pl-4">
              <p className="text-[9px] font-black text-slate-400 uppercase">
                Precio Sugerido ({margenObj}%)
              </p>
              <p className="text-lg font-black text-orange-400">
                ${precioSugerido.toFixed(2)}
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

// ─────────────────────────────────────────────────────────────
// TARJETA DE PRODUCTO
// ─────────────────────────────────────────────────────────────
function TarjetaProducto({
  prod,
  capacidades,
  gastosFijos,
  totalProductosVentaActivos,
  onEditar,
  onReceta,
  onCambiarEstado,
}: {
  prod: Producto;
  capacidades: Record<string, number>;
  gastosFijos: GastoFijo[];
  totalProductosVentaActivos: number;
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

  const totalGastos = gastosFijos.reduce((s, g) => s + g.monto, 0);
  const costoFijoUd = calcCostoFijoUnitario(
    totalGastos,
    totalProductosVentaActivos || 1,
  );
  const costoInsumos = Number(prod.costo_compra) || 0;
  const costoReal = costoInsumos + costoFijoUd;
  const margenReal =
    precioNum > 0 ? ((precioNum - costoReal) / precioNum) * 100 : 0;
  const margenObj = Number(prod.margen_objetivo) || 30;
  const precioSugerido = precioConMargen(costoReal, margenObj);

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
                className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${capFab === 0 ? 'bg-red-100 text-red-600' : capFab < 5 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}
              >
                {capFab === 0 ? '⚠ Sin stock' : `✦ ${capFab} fabricables`}
              </span>
            )}
            {!prod.es_materia_prima && precioNum > 0 && costoReal > 0 && (
              <span
                className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${bgColorMargen(margenReal)}`}
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

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-orange-500 font-black text-sm">
              ${precioNum.toFixed(2)}
            </p>
            {!prod.es_materia_prima && costoReal > 0 && (
              <p className="text-[9px] text-slate-400 font-bold">
                costo real: ${costoReal.toFixed(2)}
              </p>
            )}
            {!prod.es_materia_prima &&
              precioSugerido > 0 &&
              Math.abs(precioSugerido - precioNum) > 0.5 && (
                <span className="text-[8px] font-black bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full">
                  sugerido: ${precioSugerido.toFixed(2)}
                </span>
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
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onCambiarEstado(prod.id, prod.activo)}
            className={`p-2 rounded-xl transition-all shadow-sm ${esActivo ? 'bg-red-50 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
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

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [costoCompra, setCostoCompra] = useState('');
  const [unidad, setUnidad] = useState<string>('UNIDADES');
  const [categoriaId, setCategoriaId] = useState('');
  const [esMateriaPrima, setEsMateriaPrima] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);

  const [productoParaReceta, setProductoParaReceta] = useState<Producto | null>(
    null,
  );
  const [mostrarGastos, setMostrarGastos] = useState(false);

  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [comprimiendo, setComprimiendo] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);
  const paginaRef = useRef(0);
  const [tieneMas, setTieneMas] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);

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
        caps[id] = calcUnidadesFabricables(
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

  const obtenerProductos = useCallback(
    async (idEmpresa: string, reiniciar = false) => {
      const paginaActual = reiniciar ? 0 : paginaRef.current;
      if (!reiniciar) setCargandoMas(true);
      const desde = paginaActual * ITEMS_POR_PAGINA;
      const { data } = await supabase
        .from('productos')
        .select(`*, categorias ( nombre )`)
        .eq('empresa_id', idEmpresa)
        .order('activo', { ascending: false })
        .order('created_at', { ascending: false })
        .range(desde, desde + ITEMS_POR_PAGINA - 1);
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
          await Promise.all([
            obtenerProductos(perfil.empresa_id, true),
            cargarCapacidades(perfil.empresa_id),
            cargarGastos(perfil.empresa_id),
            supabase
              .from('categorias')
              .select('*')
              .eq('empresa_id', perfil.empresa_id)
              .order('nombre')
              .then(({ data: cats }: any) => setCategorias(cats || [])),
          ]);
        }
      }
      setCargando(false);
    };
    iniciar();
  }, [obtenerProductos, cargarCapacidades, cargarGastos, supabase]);

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

  const subirImagen = async (file: File) => {
    const fileName = `${empresaId}/${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage
      .from('productos')
      .upload(fileName, file, { contentType: 'image/webp', upsert: true });
    if (error) throw error;
    return supabase.storage.from('productos').getPublicUrl(fileName).data
      .publicUrl;
  };

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

  const productosDeVenta = productos.filter((p) => !p.es_materia_prima);
  const materiasPrimas = productos.filter((p) => p.es_materia_prima);
  const productosActivos = productosDeVenta.filter((p) => p.activo !== false);
  const productosMostrados =
    tabActivo === 'venta' ? productosDeVenta : materiasPrimas;
  const totalGastosMes = gastosFijos.reduce((s, g) => s + g.monto, 0);
  const totalGastosSemana = totalGastosMes / 4.33;

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

        {/* BANNER gastos — setup o resumen */}
        {totalGastosMes === 0 ? (
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
                Sueldos, luz, alquiler, impuestos… Se reparten{' '}
                <span className="font-black">automáticamente e igual</span>{' '}
                entre tus {productosActivos.length} productos activos.
              </p>
            </div>
            <span className="text-[10px] font-black text-blue-500 bg-blue-100 px-4 py-2 rounded-2xl uppercase flex-shrink-0">
              Configurar →
            </span>
          </button>
        ) : (
          /* Resumen gastos dual mensual/semanal */
          <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Estructura de Gastos Fijos
                </p>
                <p className="text-[9px] text-slate-400 font-bold">
                  Distribuidos automáticamente entre {productosActivos.length}{' '}
                  productos activos de venta →{' '}
                  <span className="font-black text-blue-600">
                    $
                    {calcCostoFijoUnitario(
                      totalGastosMes,
                      productosActivos.length || 1,
                    ).toFixed(2)}
                    /ud
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1 justify-end">
                    <Calendar size={10} /> Mensual
                  </p>
                  <p className="text-xl font-black text-slate-800">
                    ${totalGastosMes.toFixed(2)}
                  </p>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1 justify-end">
                    <CalendarDays size={10} /> Semanal
                  </p>
                  <p className="text-xl font-black text-blue-600">
                    ${totalGastosSemana.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => setMostrarGastos(true)}
                  className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-blue-100 hover:text-blue-600 transition-all"
                >
                  <Settings size={15} />
                </button>
              </div>
            </div>
            {/* Minibars por categoría */}
            <div className="flex gap-2 flex-wrap">
              {CATEGORIAS_GASTO.map((cat) => {
                const total = gastosFijos
                  .filter((g) => g.categoria === cat.value)
                  .reduce((s, g) => s + g.monto, 0);
                if (total === 0) return null;
                const pct =
                  totalGastosMes > 0 ? (total / totalGastosMes) * 100 : 0;
                const colorMap: Record<string, string> = {
                  blue: 'bg-blue-500',
                  yellow: 'bg-yellow-400',
                  purple: 'bg-purple-500',
                  red: 'bg-red-500',
                  slate: 'bg-slate-500',
                };
                const textMap: Record<string, string> = {
                  blue: 'text-blue-700 bg-blue-50',
                  yellow: 'text-yellow-700 bg-yellow-50',
                  purple: 'text-purple-700 bg-purple-50',
                  red: 'text-red-700 bg-red-50',
                  slate: 'text-slate-700 bg-slate-100',
                };
                return (
                  <div
                    key={cat.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl ${textMap[cat.color]}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${colorMap[cat.color]}`}
                    />
                    <span className="text-[9px] font-black uppercase">
                      {cat.label.split(' ')[0]}
                    </span>
                    <span className="text-[9px] font-bold">
                      ${total.toFixed(0)}
                    </span>
                    <span className="text-[8px] opacity-60">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
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
                Aparecerá en el catálogo. Los gastos fijos se distribuirán
                automáticamente en este producto.
              </p>
            </div>
          )}

          <form
            onSubmit={guardarProducto}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {/* Foto */}
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] p-4 hover:bg-slate-50 transition-all group">
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

        {/* TIP FLUJO */}
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
                3. Crea Productos
              </span>{' '}
              →{' '}
              <span className="text-emerald-400 font-black">
                4. Receta + Margen
              </span>
              . El sistema calcula tu precio de venta real automáticamente.
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
              Solo para uso interno. No aparecen en el catálogo público.
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
                totalProductosVentaActivos={productosActivos.length || 1}
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
          totalProductosVentaActivos={productosActivos.length || 1}
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
