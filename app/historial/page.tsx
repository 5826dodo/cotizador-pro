'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  X,
  Eye,
  AlertCircle,
  Loader2,
  DollarSign,
  Check,
  ChevronDown,
  User,
  ShoppingCart,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Package,
  RefreshCw,
} from 'lucide-react';

// ── Helpers de fecha ──────────────────────────────────────────
const toLocalISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const startOfDay = (s: string) => `${s}T00:00:00.000Z`;
const endOfDay = (s: string) => `${s}T23:59:59.999Z`;

export default function HistorialPage() {
  // ── Estado principal ──────────────────────────────────────
  const [miEmpresaId, setMiEmpresaId] = useState<string | null>(null);

  // Historial completo (todas las cotizaciones/ventas de la empresa)
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Modal de gestión
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);
  const [mostrarAbonar, setMostrarAbonar] = useState(false);
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  // Formulario de pago
  const [tasaDia, setTasaDia] = useState<number>(0);
  const [montoBsRecibido, setMontoBsRecibido] = useState<number>(0);
  const [montoUsdRecibido, setMontoUsdRecibido] = useState<number>(0);

  // Cajas del día
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    toLocalISODate(new Date()),
  );
  const [cajasDelDia, setCajasDelDia] = useState({ bs: 0, usd: 0 });
  const [cargandoCajas, setCargandoCajas] = useState(false);

  // Totales globales
  const [porCobrar, setPorCobrar] = useState(0);

  // ── Filtro de vista: 'dia' muestra solo el día seleccionado, 'todos' muestra todo ──
  const [vistaFiltro, setVistaFiltro] = useState<'dia' | 'todos'>('todos');

  // ── Init: obtener empresa_id del usuario ─────────────────
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('empresa_id')
        .eq('id', user.id)
        .single();
      if (perfil?.empresa_id) {
        setMiEmpresaId(perfil.empresa_id);
      }
    };
    init();
  }, []);

  // ── Cargar cotizaciones cuando tengamos empresa_id ────────
  useEffect(() => {
    if (miEmpresaId) {
      cargarDatos(miEmpresaId);
      cargarCajasDia(miEmpresaId, fechaSeleccionada);
    }
  }, [miEmpresaId]);

  // ── Re-cargar cajas cuando cambia la fecha ────────────────
  useEffect(() => {
    if (miEmpresaId) cargarCajasDia(miEmpresaId, fechaSeleccionada);
  }, [fechaSeleccionada]);

  // ── Cargar HISTORIAL COMPLETO ─────────────────────────────
  const cargarDatos = async (empresaId: string) => {
    setCargando(true);
    try {
      const { data: cots, error } = await supabase
        .from('cotizaciones')
        .select('*, clientes(nombre, apellido, cedula, empresa)')
        .eq('empresa_id', empresaId) // ← filtro por empresa
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error cargando historial:', error);
        return;
      }

      if (cots) {
        setCotizaciones(cots);
        const pendiente = cots
          .filter((c) => c.estado === 'aprobado')
          .reduce((acc, c) => acc + (c.total - (c.monto_pagado || 0)), 0);
        setPorCobrar(pendiente);
      }
    } finally {
      setCargando(false);
    }
  };

  // ── Cargar CAJAS DEL DÍA ──────────────────────────────────
  const cargarCajasDia = async (empresaId: string, fecha: string) => {
    setCargandoCajas(true);
    try {
      const desde = startOfDay(fecha);
      const hasta = endOfDay(fecha);

      // Buscamos pagos_registrados de cotizaciones de esta empresa en ese día
      const { data: pagos } = await supabase
        .from('pagos_registrados')
        .select('monto_bs, monto_usd, cotizacion_id, created_at')
        .gte('created_at', desde)
        .lte('created_at', hasta);

      // Filtrar solo los pagos de cotizaciones de esta empresa
      // (si la tabla tiene empresa_id directo, mejor; sino filtramos por join)
      if (pagos) {
        // Obtener ids de cotizaciones de esta empresa
        const cotIds = cotizaciones.map((c) => c.id);
        const pagosFiltrados = pagos.filter((p) =>
          cotIds.includes(p.cotizacion_id),
        );

        const totales = pagosFiltrados.reduce(
          (acc, p) => ({
            bs: acc.bs + Number(p.monto_bs || 0),
            usd: acc.usd + Number(p.monto_usd || 0),
          }),
          { bs: 0, usd: 0 },
        );
        setCajasDelDia(totales);
      }
    } finally {
      setCargandoCajas(false);
    }
  };

  // ── Navegar días ──────────────────────────────────────────
  const irDiaAnterior = () => {
    const d = new Date(fechaSeleccionada + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setFechaSeleccionada(toLocalISODate(d));
  };
  const irDiaSiguiente = () => {
    const d = new Date(fechaSeleccionada + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    if (toLocalISODate(d) <= toLocalISODate(new Date()))
      setFechaSeleccionada(toLocalISODate(d));
  };
  const esHoy = fechaSeleccionada === toLocalISODate(new Date());

  // ── Helpers de display ────────────────────────────────────
  const formatFecha = (s: string) =>
    new Date(s).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const formatFechaLarga = (s: string) => {
    const d = new Date(s + 'T12:00:00');
    return d.toLocaleDateString('es-VE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const nombreVenta = (cot: any) => {
    if (cot.clientes?.nombre)
      return `${cot.clientes.nombre} ${cot.clientes.apellido || ''}`.trim();
    if (cot.nombre_cliente_libre) return cot.nombre_cliente_libre;
    return 'Consumidor Final';
  };
  const idVenta = (cot: any) => {
    if (cot.clientes?.cedula) return `CI: ${cot.clientes.cedula}`;
    if (cot.nombre_cliente_libre) return 'Pedido catálogo';
    return 'Sin ID';
  };

  // ── Filtrado del listado ──────────────────────────────────
  // Combina búsqueda por nombre + filtro de fecha si está en modo 'dia'
  const cotizacionesFiltradas = cotizaciones.filter((c) => {
    const coincideNombre = nombreVenta(c)
      .toLowerCase()
      .includes(busqueda.toLowerCase());
    if (!coincideNombre) return false;
    if (vistaFiltro === 'dia') {
      // Filtrar solo los del día seleccionado
      const fechaCot = toLocalISODate(new Date(c.created_at));
      return fechaCot === fechaSeleccionada;
    }
    return true; // 'todos': sin filtro de fecha
  });

  // ── Aprobar operación ────────────────────────────────────
  const aprobarOperacion = async (cot: any) => {
    setProcesandoAccion(true);
    try {
      for (const item of cot.productos_seleccionados || []) {
        const { data: p } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.id)
          .single();
        if (p)
          await supabase
            .from('productos')
            .update({ stock: p.stock - item.cantidad })
            .eq('id', item.id);
      }
      await supabase
        .from('cotizaciones')
        .update({
          estado: 'aprobado',
          fecha_aprobacion: new Date().toISOString(),
        })
        .eq('id', cot.id);
      alert('✅ Operación Aprobada');
      if (miEmpresaId) cargarDatos(miEmpresaId);
      setCotizacionSeleccionada(null);
    } catch {
      alert('Error al aprobar');
    }
    setProcesandoAccion(false);
  };

  // ── Registrar pago ────────────────────────────────────────
  const registrarPago = async (
    cot: any,
    usdEquivalente: number,
    tipo: string,
    montoBsOverride?: number,
    montoUsdOverride?: number,
  ) => {
    const deudaActualUsd = cot.total - (cot.monto_pagado || 0);
    const bsAFinal =
      montoBsOverride !== undefined ? montoBsOverride : montoBsRecibido;
    const usdAFinal =
      montoUsdOverride !== undefined ? montoUsdOverride : montoUsdRecibido;
    if (usdEquivalente > deudaActualUsd + 0.05) {
      alert('⚠️ El monto excede la deuda');
      return;
    }

    setProcesandoAccion(true);
    try {
      await supabase.from('pagos_registrados').insert([
        {
          cotizacion_id: cot.id,
          monto_bs: bsAFinal,
          monto_usd: usdAFinal,
          tasa_aplicada: tasaDia || cot.tasa_bcv,
          observacion: tipo,
        },
      ]);
      const nuevoTotal = (cot.monto_pagado || 0) + usdEquivalente;
      await supabase
        .from('cotizaciones')
        .update({
          monto_pagado: nuevoTotal,
          estado_pago: nuevoTotal >= cot.total - 0.05 ? 'pagado' : 'parcial',
        })
        .eq('id', cot.id);

      alert('✅ Pago procesado');
      setMontoBsRecibido(0);
      setMontoUsdRecibido(0);
      setTasaDia(0);
      setCotizacionSeleccionada(null);
      setMostrarAbonar(false);
      if (miEmpresaId) {
        await cargarDatos(miEmpresaId);
        await cargarCajasDia(miEmpresaId, fechaSeleccionada);
      }
    } catch {
      alert('Error al procesar pago');
    }
    setProcesandoAccion(false);
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── SELECTOR DE FECHA ── */}
        <section className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={irDiaAnterior}
                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all text-slate-600"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-center min-w-[160px]">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {esHoy ? '📅 HOY' : '📅 Fecha'}
                </p>
                <p className="font-black text-slate-800 text-sm capitalize">
                  {formatFechaLarga(fechaSeleccionada)}
                </p>
              </div>
              <button
                onClick={irDiaSiguiente}
                disabled={esHoy}
                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all text-slate-600 disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Calendar
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  value={fechaSeleccionada}
                  max={toLocalISODate(new Date())}
                  onChange={(e) =>
                    e.target.value && setFechaSeleccionada(e.target.value)
                  }
                  className="pl-9 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-orange-500 transition-all"
                />
              </div>
              {!esHoy && (
                <button
                  onClick={() =>
                    setFechaSeleccionada(toLocalISODate(new Date()))
                  }
                  className="px-4 py-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-2xl text-[10px] font-black uppercase hover:bg-orange-100 transition-all"
                >
                  Hoy
                </button>
              )}
              <button
                onClick={() =>
                  miEmpresaId && cargarCajasDia(miEmpresaId, fechaSeleccionada)
                }
                className="p-2.5 bg-slate-100 hover:bg-orange-50 text-slate-400 hover:text-orange-500 rounded-2xl transition-all"
                title="Actualizar"
              >
                <RefreshCw
                  size={15}
                  className={cargandoCajas ? 'animate-spin' : ''}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ── CAJAS DEL DÍA ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100">
            <p className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1">
              <BarChart3 size={11} />{' '}
              {esHoy
                ? 'Caja Bs. Hoy'
                : `Bs. — ${formatFecha(fechaSeleccionada)}`}
            </p>
            {cargandoCajas ? (
              <div className="h-9 bg-emerald-500/50 rounded-xl animate-pulse mt-2" />
            ) : (
              <h3 className="text-3xl font-black mt-1">
                Bs.{' '}
                {cajasDelDia.bs.toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                })}
              </h3>
            )}
          </div>
          <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl shadow-slate-200">
            <p className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1">
              <DollarSign size={11} />{' '}
              {esHoy
                ? 'Caja USD Hoy'
                : `USD — ${formatFecha(fechaSeleccionada)}`}
            </p>
            {cargandoCajas ? (
              <div className="h-9 bg-white/10 rounded-xl animate-pulse mt-2" />
            ) : (
              <h3 className="text-3xl font-black mt-1">
                $
                {cajasDelDia.usd.toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                })}
              </h3>
            )}
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-orange-100">
            <p className="text-[10px] font-black text-slate-400 uppercase">
              Por Cobrar (Global)
            </p>
            <h3 className="text-3xl font-black text-red-600 mt-1">
              ${porCobrar.toFixed(2)}
            </h3>
            <p className="text-[9px] text-slate-400 font-bold mt-1">
              Ventas aprobadas pendientes
            </p>
          </div>
        </section>

        {/* ── CONTROLES DEL LISTADO ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Buscador */}
          <input
            type="text"
            placeholder="Buscar por nombre de cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 p-4 rounded-2xl border-none ring-2 ring-slate-100 focus:ring-orange-500 font-bold outline-none shadow-sm transition-all bg-white"
          />

          {/* Toggle: Ver todos / Ver día */}
          <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner flex-shrink-0">
            <button
              onClick={() => setVistaFiltro('todos')}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${vistaFiltro === 'todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              Todo el historial
            </button>
            <button
              onClick={() => setVistaFiltro('dia')}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${vistaFiltro === 'dia' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'text-slate-500'}`}
            >
              {esHoy ? 'Solo hoy' : 'Solo este día'}
            </button>
          </div>

          {/* Botón refrescar historial */}
          <button
            onClick={() => miEmpresaId && cargarDatos(miEmpresaId)}
            disabled={cargando}
            className="p-3 bg-white border-2 border-slate-200 rounded-2xl text-slate-400 hover:text-orange-500 hover:border-orange-300 transition-all flex-shrink-0"
          >
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Contador de resultados */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {cargando
              ? 'Cargando...'
              : `${cotizacionesFiltradas.length} registro${cotizacionesFiltradas.length !== 1 ? 's' : ''}`}
            {vistaFiltro === 'dia' &&
              ` del ${esHoy ? 'día de hoy' : formatFecha(fechaSeleccionada)}`}
          </span>
          {vistaFiltro === 'dia' && (
            <span className="bg-orange-100 text-orange-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
              Filtrado por fecha
            </span>
          )}
        </div>

        {/* ── LISTADO PRINCIPAL ── */}
        <div className="space-y-4">
          {cargando ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="animate-spin text-orange-500" size={32} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Cargando historial...
              </p>
            </div>
          ) : cotizacionesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
                <Package size={28} className="text-slate-300" />
              </div>
              <p className="font-black text-slate-400 uppercase text-xs tracking-widest">
                {busqueda
                  ? 'Sin resultados para esa búsqueda'
                  : vistaFiltro === 'dia'
                    ? `Sin ventas el ${esHoy ? 'día de hoy' : formatFecha(fechaSeleccionada)}`
                    : 'Sin registros aún'}
              </p>
              {vistaFiltro === 'dia' && (
                <button
                  onClick={() => setVistaFiltro('todos')}
                  className="mt-3 text-[10px] font-black text-orange-500 uppercase hover:underline"
                >
                  Ver todo el historial →
                </button>
              )}
            </div>
          ) : (
            cotizacionesFiltradas.map((cot) => {
              const deudaUsd = cot.total - (cot.monto_pagado || 0);
              const esCatalogo = !!cot.nombre_cliente_libre;
              return (
                <div
                  key={cot.id}
                  className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-slate-50 hover:border-orange-100 transition-all"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    {/* INFO CLIENTE */}
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-4 rounded-[1.5rem] shadow-lg ${esCatalogo ? 'bg-orange-100' : 'bg-slate-900'}`}
                      >
                        {esCatalogo ? (
                          <Package className="text-orange-600" size={24} />
                        ) : (
                          <User className="text-orange-500" size={24} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          {esCatalogo && (
                            <span className="text-[8px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase">
                              📦 Catálogo
                            </span>
                          )}
                          <span
                            className={`text-[8px] px-2 py-0.5 rounded-full font-black text-white uppercase ${cot.tipo_operacion === 'venta_directa' ? 'bg-orange-600' : 'bg-blue-600'}`}
                          >
                            {cot.tipo_operacion === 'venta_directa'
                              ? 'Venta'
                              : 'Cotización'}
                          </span>
                          <span
                            className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${
                              cot.estado_pago === 'pagado'
                                ? 'bg-emerald-100 text-emerald-700'
                                : cot.estado_pago === 'parcial'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {cot.estado_pago === 'pagado'
                              ? '✅ Pagado'
                              : cot.estado_pago === 'parcial'
                                ? '⏳ Parcial'
                                : '❌ Pendiente'}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-800 italic uppercase tracking-tighter leading-tight">
                          {nombreVenta(cot)}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                            {idVenta(cot)}
                          </span>
                          <span className="text-[10px] font-black text-orange-600/70 italic">
                            {formatFecha(cot.created_at)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {new Date(cot.created_at).toLocaleTimeString(
                              'es-VE',
                              { hour: '2-digit', minute: '2-digit' },
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* MONTOS */}
                    <div className="grid grid-cols-2 md:flex md:items-center gap-6 md:gap-8 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                      <div className="text-left md:text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase italic">
                          Total
                        </p>
                        <p className="font-black text-lg text-slate-900 leading-none">
                          {cot.moneda === 'BS'
                            ? `Bs. ${(cot.total * cot.tasa_bcv).toLocaleString('es-VE')}`
                            : `$${cot.total.toFixed(2)}`}
                        </p>
                        {cot.moneda === 'BS' && (
                          <p className="text-[9px] text-slate-400">
                            (${cot.total.toFixed(2)} USD)
                          </p>
                        )}
                      </div>
                      <div className="text-right border-l-2 border-orange-100 pl-6">
                        <p className="text-[9px] font-black text-red-400 uppercase italic">
                          Saldo
                        </p>
                        {deudaUsd <= 0.05 ? (
                          <p className="font-black text-emerald-500 text-lg italic uppercase">
                            Solvente
                          </p>
                        ) : (
                          <p className="font-black text-red-600 text-2xl leading-none tracking-tighter">
                            {cot.moneda === 'BS'
                              ? `Bs. ${(deudaUsd * cot.tasa_bcv).toLocaleString('es-VE')}`
                              : `$${deudaUsd.toFixed(2)}`}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setCotizacionSeleccionada(cot);
                          setMostrarAbonar(false);
                        }}
                        className="col-span-2 md:col-span-1 p-4 bg-slate-900 text-white rounded-[1.5rem] hover:bg-orange-600 transition-all flex justify-center items-center shadow-xl shadow-slate-200"
                      >
                        <Eye size={22} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── MODAL DE GESTIÓN DE COBRO ── */}
      {cotizacionSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            {/* Header modal */}
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center border-b-4 border-orange-600">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter">
                    Gestión de Cobro
                  </h3>
                  <span
                    className={`text-[8px] px-2 py-0.5 rounded-full font-black text-white uppercase ${cotizacionSeleccionada.tipo_operacion === 'venta_directa' ? 'bg-orange-600' : 'bg-blue-600'}`}
                  >
                    {cotizacionSeleccionada.tipo_operacion === 'venta_directa'
                      ? 'Venta'
                      : 'Cotización'}
                  </span>
                  {cotizacionSeleccionada.nombre_cliente_libre && (
                    <span className="text-[8px] px-2 py-0.5 rounded-full font-black bg-orange-100 text-orange-600 uppercase">
                      📦 Catálogo
                    </span>
                  )}
                </div>
                <p className="font-black text-orange-300 text-base uppercase truncate">
                  {nombreVenta(cotizacionSeleccionada)}
                </p>
                <div className="flex items-center gap-3 flex-wrap mt-1">
                  <span className="text-[10px] font-bold text-slate-400">
                    Tasa: {cotizacionSeleccionada.tasa_bcv}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatFecha(cotizacionSeleccionada.created_at)}
                  </span>
                  <span className="text-[10px] font-black bg-orange-600/20 text-orange-500 px-2 py-0.5 rounded-lg border border-orange-600/30">
                    TOTAL:{' '}
                    {cotizacionSeleccionada.moneda === 'BS'
                      ? `Bs. ${(cotizacionSeleccionada.total * cotizacionSeleccionada.tasa_bcv).toLocaleString('es-VE')}`
                      : `$${cotizacionSeleccionada.total.toFixed(2)}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCotizacionSeleccionada(null)}
                className="p-3 bg-white/10 rounded-2xl hover:bg-red-500 transition-all text-white ml-4 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo modal */}
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scroll">
              {/* Detalle productos */}
              <div className="bg-slate-50 rounded-[2rem] p-5 border-2 border-slate-100">
                <details className="group">
                  <summary className="list-none flex justify-between items-center cursor-pointer">
                    <div className="flex items-center gap-2 text-slate-500">
                      <ShoppingCart size={14} />
                      <span className="text-[10px] font-black uppercase italic tracking-widest">
                        Detalle (
                        {cotizacionSeleccionada.productos_seleccionados?.length}{' '}
                        productos)
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      className="group-open:rotate-180 transition-transform text-slate-400"
                    />
                  </summary>
                  <div className="mt-4 space-y-2 max-h-36 overflow-y-auto pr-2">
                    {cotizacionSeleccionada.productos_seleccionados?.map(
                      (item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-white p-3 rounded-[1rem] shadow-sm border border-slate-100"
                        >
                          <span className="text-[11px] font-black text-slate-700 italic uppercase">
                            {item.cantidad} × {item.nombre}
                          </span>
                          <span className="text-[11px] font-black text-slate-900">
                            ${(item.precio * item.cantidad).toFixed(2)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </details>
              </div>

              {/* Lógica de cobro */}
              {cotizacionSeleccionada.estado === 'pendiente' ? (
                <div className="p-8 bg-amber-50 rounded-[2.5rem] border-2 border-dashed border-amber-200 text-center">
                  <AlertCircle
                    className="mx-auto mb-3 text-amber-500"
                    size={32}
                  />
                  <p className="text-sm font-black text-amber-800 uppercase mb-4 italic">
                    Requiere aprobación antes de cobrar
                  </p>
                  <button
                    onClick={() => aprobarOperacion(cotizacionSeleccionada)}
                    disabled={procesandoAccion}
                    className="w-full bg-amber-500 text-white p-5 rounded-[1.5rem] font-black uppercase text-xs shadow-xl hover:scale-[1.02] transition-transform disabled:opacity-50"
                  >
                    {procesandoAccion
                      ? 'Procesando...'
                      : 'Aprobar y Activar Cobro'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cards pagado / deuda */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                      <p className="text-[9px] font-black text-emerald-400 uppercase italic mb-1">
                        Pagado
                      </p>
                      <p className="text-lg font-black text-emerald-700 leading-none">
                        {cotizacionSeleccionada.moneda === 'BS'
                          ? `Bs. ${(cotizacionSeleccionada.monto_pagado * cotizacionSeleccionada.tasa_bcv).toLocaleString('es-VE')}`
                          : `$${(cotizacionSeleccionada.monto_pagado || 0).toFixed(2)}`}
                      </p>
                    </div>
                    <div className="p-5 bg-red-50 rounded-[2rem] border border-red-100">
                      <p className="text-[9px] font-black text-red-400 uppercase italic mb-1">
                        Deuda Pendiente
                      </p>
                      <p className="text-lg font-black text-red-600 leading-none">
                        {cotizacionSeleccionada.moneda === 'BS'
                          ? `Bs. ${((cotizacionSeleccionada.total - (cotizacionSeleccionada.monto_pagado || 0)) * cotizacionSeleccionada.tasa_bcv).toLocaleString('es-VE')}`
                          : `$${(cotizacionSeleccionada.total - (cotizacionSeleccionada.monto_pagado || 0)).toFixed(2)}`}
                      </p>
                    </div>
                  </div>

                  {/* Panel de cobro o badge solvente */}
                  {cotizacionSeleccionada.total -
                    (cotizacionSeleccionada.monto_pagado || 0) >
                  0.05 ? (
                    <div className="space-y-4">
                      <button
                        onClick={() => setMostrarAbonar(!mostrarAbonar)}
                        className="w-full bg-slate-900 text-white p-5 rounded-[1.5rem] font-black uppercase text-xs flex justify-center items-center gap-3 shadow-xl hover:bg-orange-600 transition-all"
                      >
                        {mostrarAbonar
                          ? 'Cerrar Registro'
                          : 'Registrar Pago / Abono'}
                        <ChevronDown
                          size={18}
                          className={`transition-transform duration-300 ${mostrarAbonar ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {mostrarAbonar &&
                        (() => {
                          const deudaPendienteUsd =
                            cotizacionSeleccionada.total -
                            (cotizacionSeleccionada.monto_pagado || 0);
                          const tasaParaCalculo =
                            tasaDia > 0
                              ? tasaDia
                              : cotizacionSeleccionada.tasa_bcv || 1;
                          const deudaEnBs = Number(
                            (deudaPendienteUsd * tasaParaCalculo).toFixed(2),
                          );
                          return (
                            <div className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
                              {/* Tasa */}
                              <div className="relative">
                                <label className="text-[9px] font-black uppercase text-slate-400 absolute -top-2 left-4 bg-white px-2 z-10">
                                  Tasa del Día
                                </label>
                                <input
                                  type="number"
                                  placeholder={`Tasa actual: ${cotizacionSeleccionada.tasa_bcv}`}
                                  value={tasaDia || ''}
                                  onChange={(e) =>
                                    setTasaDia(parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full p-4 rounded-[1.2rem] border-2 border-slate-200 font-black text-slate-700 focus:border-orange-500 outline-none"
                                />
                              </div>

                              {/* Inputs abono */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <span className="text-[8px] font-bold text-emerald-500 ml-2 italic">
                                    Abonar Bolívares
                                  </span>
                                  <input
                                    type="number"
                                    value={montoBsRecibido || ''}
                                    placeholder={`Bs. ${deudaEnBs}`}
                                    onChange={(e) =>
                                      setMontoBsRecibido(
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="w-full p-4 rounded-[1.2rem] border-2 border-emerald-100 font-black text-emerald-600 outline-none focus:ring-2 ring-emerald-500"
                                  />
                                </div>
                                <div>
                                  <span className="text-[8px] font-bold text-blue-500 ml-2 italic">
                                    Abonar Dólares
                                  </span>
                                  <input
                                    type="number"
                                    value={montoUsdRecibido || ''}
                                    placeholder={`$${deudaPendienteUsd.toFixed(2)}`}
                                    onChange={(e) =>
                                      setMontoUsdRecibido(
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="w-full p-4 rounded-[1.2rem] border-2 border-blue-100 font-black text-blue-600 outline-none focus:ring-2 ring-blue-500"
                                  />
                                </div>
                              </div>

                              {/* Confirmar abono */}
                              <button
                                disabled={
                                  montoBsRecibido <= 0 && montoUsdRecibido <= 0
                                }
                                onClick={() =>
                                  registrarPago(
                                    cotizacionSeleccionada,
                                    montoUsdRecibido +
                                      montoBsRecibido / tasaParaCalculo,
                                    'Abono Parcial',
                                  )
                                }
                                className={`w-full p-5 rounded-[1.5rem] font-black uppercase text-xs transition-all ${montoBsRecibido > 0 || montoUsdRecibido > 0 ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                              >
                                Confirmar Abono
                              </button>

                              {/* Divisor */}
                              <div className="relative py-1">
                                <div className="absolute inset-0 flex items-center">
                                  <span className="w-full border-t border-slate-200" />
                                </div>
                                <div className="relative flex justify-center">
                                  <span className="bg-slate-50 px-3 text-[8px] font-black uppercase text-slate-400 italic">
                                    Liquidar deuda total:
                                  </span>
                                </div>
                              </div>

                              {/* Liquidar todo */}
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() =>
                                    registrarPago(
                                      cotizacionSeleccionada,
                                      deudaPendienteUsd,
                                      `Total en Bs (Tasa: ${tasaParaCalculo})`,
                                      deudaEnBs,
                                      0,
                                    )
                                  }
                                  className="bg-white border-2 border-emerald-500 text-emerald-600 p-4 rounded-[1.2rem] font-black uppercase text-[10px] flex flex-col items-center hover:bg-emerald-50 transition-all"
                                >
                                  <span className="text-xs">
                                    Bs. {deudaEnBs.toLocaleString('es-VE')}
                                  </span>
                                  <span className="text-[7px] opacity-70">
                                    Pagar todo en Bs
                                  </span>
                                </button>
                                <button
                                  onClick={() =>
                                    registrarPago(
                                      cotizacionSeleccionada,
                                      deudaPendienteUsd,
                                      'Total en USD',
                                      0,
                                      deudaPendienteUsd,
                                    )
                                  }
                                  className="bg-slate-900 text-white p-4 rounded-[1.2rem] font-black uppercase text-[10px] flex flex-col items-center hover:bg-black transition-all shadow-lg"
                                >
                                  <span className="text-xs">
                                    $ {deudaPendienteUsd.toFixed(2)}
                                  </span>
                                  <span className="text-[7px] opacity-70">
                                    Pagar todo en $
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                    </div>
                  ) : (
                    <div className="p-10 bg-emerald-50 rounded-[3rem] text-center border-4 border-emerald-100 shadow-inner">
                      <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
                        <Check size={40} strokeWidth={3} />
                      </div>
                      <h3 className="text-2xl font-black text-emerald-900 uppercase italic tracking-tighter">
                        Estado Solvente
                      </h3>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">
                        Operación Finalizada
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #fb923c;
          border-radius: 10px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: #f8fafc;
        }
      `}</style>
    </main>
  );
}
