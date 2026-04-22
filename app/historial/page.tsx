'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  X,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  Clock,
  Check,
  TrendingUp,
  ChevronDown,
  User,
  ShoppingCart,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Package,
  Wallet,
  RefreshCw,
} from 'lucide-react';

// ── Helpers de fecha ──────────────────────────────────────────
const toLocalISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const startOfDay = (dateStr: string) => `${dateStr}T00:00:00.000Z`;
const endOfDay = (dateStr: string) => `${dateStr}T23:59:59.999Z`;

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);
  const [mostrarAbonar, setMostrarAbonar] = useState(false);

  // Formulario pago
  const [tasaDia, setTasaDia] = useState<number>(0);
  const [montoBsRecibido, setMontoBsRecibido] = useState<number>(0);
  const [montoUsdRecibido, setMontoUsdRecibido] = useState<number>(0);

  // ── Fecha seleccionada (por defecto HOY) ──────────────────
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    toLocalISODate(new Date()),
  );
  const [cajasDelDia, setCajasDelDia] = useState({ bs: 0, usd: 0 });
  const [ventasDelDia, setVentasDelDia] = useState<any[]>([]);
  const [cargandoCajas, setCargandoCajas] = useState(false);

  // Totales históricos globales (sin filtro de fecha)
  const [totalesGlobales, setTotalesGlobales] = useState({ porCobrar: 0 });

  // ── Cargar cajas y ventas del día seleccionado ────────────
  const cargarCajasDia = async (fecha: string) => {
    setCargandoCajas(true);
    try {
      const desde = startOfDay(fecha);
      const hasta = endOfDay(fecha);

      // Pagos registrados del día
      const { data: pagos } = await supabase
        .from('pagos_registrados')
        .select('monto_bs, monto_usd, tasa_aplicada, cotizacion_id, created_at')
        .gte('created_at', desde)
        .lte('created_at', hasta);

      if (pagos) {
        const totales = pagos.reduce(
          (acc, p) => ({
            bs: acc.bs + Number(p.monto_bs || 0),
            usd: acc.usd + Number(p.monto_usd || 0),
          }),
          { bs: 0, usd: 0 },
        );
        setCajasDelDia(totales);
      }

      // Ventas del día (cotizaciones creadas ese día)
      const { data: ventas } = await supabase
        .from('cotizaciones')
        .select('*, clientes(nombre, apellido)')
        .gte('created_at', desde)
        .lte('created_at', hasta)
        .order('created_at', { ascending: false });

      setVentasDelDia(ventas || []);
    } finally {
      setCargandoCajas(false);
    }
  };

  // ── Cargar historial completo ──────────────────────────────
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data: cots } = await supabase
        .from('cotizaciones')
        // Incluir tanto clientes registrados como nombre_cliente_libre
        .select('*, clientes(nombre, apellido, cedula, empresa)')
        .order('created_at', { ascending: false });
      if (cots) {
        setCotizaciones(cots);
        const porCobrar = cots
          .filter((c) => c.estado === 'aprobado')
          .reduce((acc, c) => acc + (c.total - (c.monto_pagado || 0)), 0);
        setTotalesGlobales({ porCobrar });
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);
  useEffect(() => {
    cargarCajasDia(fechaSeleccionada);
  }, [fechaSeleccionada]);

  // ── Navegar fechas ────────────────────────────────────────
  const irDiaAnterior = () => {
    const d = new Date(fechaSeleccionada + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setFechaSeleccionada(toLocalISODate(d));
  };
  const irDiaSiguiente = () => {
    const d = new Date(fechaSeleccionada + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const hoy = toLocalISODate(new Date());
    if (toLocalISODate(d) <= hoy) setFechaSeleccionada(toLocalISODate(d));
  };
  const esHoy = fechaSeleccionada === toLocalISODate(new Date());

  const formatearFecha = (fechaStr: string) =>
    new Date(fechaStr).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const formatearFechaLarga = (fechaStr: string) => {
    const d = new Date(fechaStr + 'T12:00:00');
    return d.toLocaleDateString('es-VE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // ── Nombre visible de la venta (cliente o libre) ──────────
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
      cargarDatos();
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
      const nuevoTotalPagado = (cot.monto_pagado || 0) + usdEquivalente;
      await supabase
        .from('cotizaciones')
        .update({
          monto_pagado: nuevoTotalPagado,
          estado_pago:
            nuevoTotalPagado >= cot.total - 0.05 ? 'pagado' : 'parcial',
        })
        .eq('id', cot.id);
      alert('✅ Pago procesado');
      setMontoBsRecibido(0);
      setMontoUsdRecibido(0);
      setTasaDia(0);
      setCotizacionSeleccionada(null);
      setMostrarAbonar(false);
      await cargarDatos();
      await cargarCajasDia(fechaSeleccionada);
    } catch {
      alert('Error al procesar pago');
    }
    setProcesandoAccion(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── SELECTOR DE FECHA ── */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={irDiaAnterior}
                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all text-slate-600"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {esHoy ? '📅 HOY' : '📅 Fecha Seleccionada'}
                </p>
                <p className="font-black text-slate-800 text-sm capitalize">
                  {formatearFechaLarga(fechaSeleccionada)}
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
            <div className="flex items-center gap-3">
              {/* Calendar input */}
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  value={fechaSeleccionada}
                  max={toLocalISODate(new Date())}
                  onChange={(e) =>
                    e.target.value && setFechaSeleccionada(e.target.value)
                  }
                  className="pl-9 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-orange-500 transition-all"
                />
              </div>
              {!esHoy && (
                <button
                  onClick={() =>
                    setFechaSeleccionada(toLocalISODate(new Date()))
                  }
                  className="px-4 py-3 bg-orange-50 text-orange-600 border border-orange-200 rounded-2xl text-[10px] font-black uppercase hover:bg-orange-100 transition-all"
                >
                  Hoy
                </button>
              )}
              <button
                onClick={() => cargarCajasDia(fechaSeleccionada)}
                className="p-3 bg-slate-100 hover:bg-orange-50 text-slate-400 hover:text-orange-500 rounded-2xl transition-all"
              >
                <RefreshCw
                  size={15}
                  className={cargandoCajas ? 'animate-spin' : ''}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ── CAJAS DEL DÍA SELECCIONADO ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* BS */}
          <div className="bg-emerald-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100">
            <p className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1">
              <BarChart3 size={11} />{' '}
              {esHoy
                ? 'Caja Bolívares Hoy'
                : `Bs. del ${formatearFecha(fechaSeleccionada)}`}
            </p>
            {cargandoCajas ? (
              <div className="h-9 bg-emerald-500/50 rounded-xl animate-pulse mt-2" />
            ) : (
              <h3 className="text-3xl font-black">
                Bs.{' '}
                {cajasDelDia.bs.toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                })}
              </h3>
            )}
          </div>

          {/* USD */}
          <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl shadow-slate-200">
            <p className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1">
              <DollarSign size={11} />{' '}
              {esHoy
                ? 'Caja Dólares Hoy'
                : `USD del ${formatearFecha(fechaSeleccionada)}`}
            </p>
            {cargandoCajas ? (
              <div className="h-9 bg-white/10 rounded-xl animate-pulse mt-2" />
            ) : (
              <h3 className="text-3xl font-black">
                $
                {cajasDelDia.usd.toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                })}
              </h3>
            )}
          </div>

          {/* Por cobrar */}
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-orange-100">
            <p className="text-[10px] font-black text-slate-400 uppercase">
              Por Cobrar (Global)
            </p>
            <h3 className="text-3xl font-black text-red-600">
              ${totalesGlobales.porCobrar.toFixed(2)}
            </h3>
            <p className="text-[9px] text-slate-400 font-bold mt-1">
              En ventas aprobadas pendientes
            </p>
          </div>
        </section>

        {/* ── RESUMEN DE VENTAS DEL DÍA ── */}
        {ventasDelDia.length > 0 && (
          <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-slate-800 text-base uppercase tracking-tighter flex items-center gap-2">
                <BarChart3 size={16} className="text-orange-500" />
                Ventas del {esHoy ? 'Día' : formatearFecha(fechaSeleccionada)}
                <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-2 py-0.5 rounded-full">
                  {ventasDelDia.length}
                </span>
              </h2>
              <div className="flex gap-3">
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase">
                    Total Vendido
                  </p>
                  <p className="font-black text-slate-800">
                    ${ventasDelDia.reduce((s, v) => s + v.total, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {ventasDelDia.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setCotizacionSeleccionada(v)}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl hover:bg-orange-50 cursor-pointer transition-all border border-transparent hover:border-orange-100"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${v.tipo_operacion === 'venta_directa' ? 'bg-orange-500' : 'bg-blue-500'}`}
                    />
                    <div>
                      <p className="font-black text-xs text-slate-800 uppercase">
                        {nombreVenta(v)}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold">
                        {v.tipo_operacion === 'venta_directa'
                          ? 'Venta'
                          : 'Cotización'}{' '}
                        ·{' '}
                        {new Date(v.created_at).toLocaleTimeString('es-VE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {v.nombre_cliente_libre && (
                          <span className="ml-1 text-orange-500">
                            📦 Catálogo
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm text-slate-800">
                      ${v.total.toFixed(2)}
                    </p>
                    <p
                      className={`text-[8px] font-black uppercase ${v.estado_pago === 'pagado' ? 'text-emerald-500' : v.estado_pago === 'parcial' ? 'text-amber-500' : 'text-red-400'}`}
                    >
                      {v.estado_pago === 'pagado'
                        ? '✅ Pagado'
                        : v.estado_pago === 'parcial'
                          ? '⏳ Parcial'
                          : '❌ Pendiente'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── BÚSQUEDA Y HISTORIAL COMPLETO ── */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar cliente en todo el historial..."
            className="flex-1 p-4 rounded-2xl border-none ring-2 ring-slate-100 focus:ring-orange-500 font-bold outline-none shadow-sm transition-all"
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {cargando ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : (
            cotizaciones
              .filter((c) => {
                const nombre = nombreVenta(c).toLowerCase();
                return nombre.includes(busqueda.toLowerCase());
              })
              .map((cot) => {
                const deudaUsd = cot.total - (cot.monto_pagado || 0);
                const estaPagado = deudaUsd <= 0.05;
                const esCatalogo = !!cot.nombre_cliente_libre;

                return (
                  <div
                    key={cot.id}
                    className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-slate-50 hover:border-orange-100 transition-all"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      {/* INFO */}
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                              Cliente
                            </p>
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
                          </div>
                          <h3 className="text-xl font-black text-slate-800 italic uppercase tracking-tighter">
                            {nombreVenta(cot)}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                              {idVenta(cot)}
                            </span>
                            <span className="text-[10px] font-black text-orange-600/70 italic">
                              {formatearFecha(cot.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* MONTOS */}
                      <div className="grid grid-cols-2 md:flex md:items-center gap-8 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                        <div className="text-left md:text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase italic">
                            Monto Total
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
                          {deudaUsd <= 0 ? (
                            <p className="font-black text-emerald-500 text-lg italic uppercase">
                              Solvente
                            </p>
                          ) : (
                            <p className="font-black text-red-600 text-2xl leading-none tracking-tighter animate-pulse">
                              {cot.moneda === 'BS'
                                ? `Bs. ${(deudaUsd * cot.tasa_bcv).toLocaleString('es-VE')}`
                                : `$${deudaUsd.toFixed(2)}`}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setCotizacionSeleccionada(cot)}
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

      {/* MODAL GESTIÓN */}
      {cotizacionSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            {/* Header */}
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center border-b-4 border-orange-600">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">
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
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Tasa: {cotizacionSeleccionada.tasa_bcv}
                  </p>
                  <span className="text-slate-300 text-[10px]">
                    {formatearFecha(cotizacionSeleccionada.created_at)}
                  </span>
                  <span className="text-[10px] font-black bg-orange-600/20 text-orange-500 px-2 py-0.5 rounded-lg border border-orange-600/30">
                    TOTAL:{' '}
                    {cotizacionSeleccionada.moneda === 'BS'
                      ? `Bs. ${(cotizacionSeleccionada.total * cotizacionSeleccionada.tasa_bcv).toLocaleString('es-VE')}`
                      : `$${cotizacionSeleccionada.total.toFixed(2)}`}
                  </span>
                </div>
                {/* Mostrar nombre cliente catálogo prominentemente */}
                <p className="font-black text-orange-300 text-sm mt-1 uppercase">
                  {nombreVenta(cotizacionSeleccionada)}
                </p>
              </div>
              <button
                onClick={() => setCotizacionSeleccionada(null)}
                className="p-3 bg-white/10 rounded-2xl hover:bg-red-500 transition-all text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo */}
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scroll">
              {/* Productos */}
              <div className="bg-slate-50 rounded-[2rem] p-5 border-2 border-slate-100">
                <details className="group">
                  <summary className="list-none flex justify-between items-center cursor-pointer">
                    <div className="flex items-center gap-2 text-slate-500">
                      <ShoppingCart size={14} />
                      <span className="text-[10px] font-black uppercase italic tracking-widest">
                        Detalle del Pedido (
                        {cotizacionSeleccionada.productos_seleccionados?.length}
                        )
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      className="group-open:rotate-180 transition-transform text-slate-400"
                    />
                  </summary>
                  <div className="mt-4 space-y-2 max-h-32 overflow-y-auto pr-2">
                    {cotizacionSeleccionada.productos_seleccionados?.map(
                      (item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-white p-3 rounded-[1rem] shadow-sm border border-slate-100"
                        >
                          <span className="text-[11px] font-black text-slate-700 italic uppercase">
                            {item.cantidad} x {item.nombre}
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

              {/* Lógica cobro */}
              {cotizacionSeleccionada.estado === 'pendiente' ? (
                <div className="p-8 bg-amber-50 rounded-[2.5rem] border-2 border-dashed border-amber-200 text-center">
                  <AlertCircle
                    className="mx-auto mb-3 text-amber-500"
                    size={32}
                  />
                  <p className="text-sm font-black text-amber-800 uppercase mb-4 italic">
                    Aprobación requerida
                  </p>
                  <button
                    onClick={() => aprobarOperacion(cotizacionSeleccionada)}
                    className="w-full bg-amber-500 text-white p-5 rounded-[1.5rem] font-black uppercase text-xs shadow-xl hover:scale-[1.02] transition-transform"
                  >
                    Aprobar Ahora
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
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
                        Deuda
                      </p>
                      <p className="text-lg font-black text-red-600 leading-none">
                        {cotizacionSeleccionada.moneda === 'BS'
                          ? `Bs. ${((cotizacionSeleccionada.total - (cotizacionSeleccionada.monto_pagado || 0)) * cotizacionSeleccionada.tasa_bcv).toLocaleString('es-VE')}`
                          : `$${(cotizacionSeleccionada.total - (cotizacionSeleccionada.monto_pagado || 0)).toFixed(2)}`}
                      </p>
                    </div>
                  </div>

                  {cotizacionSeleccionada.total -
                    (cotizacionSeleccionada.monto_pagado || 0) >
                  0.05 ? (
                    <div className="space-y-4">
                      <button
                        onClick={() => setMostrarAbonar(!mostrarAbonar)}
                        className="w-full bg-slate-900 text-white p-5 rounded-[1.5rem] font-black uppercase text-xs flex justify-center items-center gap-3 shadow-xl"
                      >
                        {mostrarAbonar ? 'Cerrar' : 'Registrar Pago / Abono'}
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
                              <div className="relative">
                                <label className="text-[9px] font-black uppercase text-slate-400 absolute -top-2 left-4 bg-white px-2 z-10">
                                  Tasa del Día
                                </label>
                                <input
                                  type="number"
                                  className="w-full p-4 rounded-[1.2rem] border-2 border-slate-200 font-black text-slate-700 focus:border-orange-500 outline-none"
                                  placeholder="Ej: 54.50"
                                  value={tasaDia || ''}
                                  onChange={(e) =>
                                    setTasaDia(parseFloat(e.target.value) || 0)
                                  }
                                />
                              </div>
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
                              <button
                                disabled={
                                  montoBsRecibido <= 0 && montoUsdRecibido <= 0
                                }
                                onClick={() => {
                                  const abonoUsd =
                                    montoUsdRecibido +
                                    montoBsRecibido / tasaParaCalculo;
                                  registrarPago(
                                    cotizacionSeleccionada,
                                    abonoUsd,
                                    'Abono Parcial',
                                  );
                                }}
                                className={`w-full p-5 rounded-[1.5rem] font-black uppercase text-xs transition-all ${montoBsRecibido > 0 || montoUsdRecibido > 0 ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                              >
                                Confirmar Abono
                              </button>
                              <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                  <span className="w-full border-t border-slate-200"></span>
                                </div>
                                <div className="relative flex justify-center text-[8px] uppercase font-black text-slate-400">
                                  <span className="bg-slate-50 px-2 italic">
                                    Liquidar Deuda Total:
                                  </span>
                                </div>
                              </div>
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
                                  className="bg-white border-2 border-emerald-500 text-emerald-600 p-4 rounded-[1.2rem] font-black uppercase text-[10px] flex flex-col items-center hover:bg-emerald-50"
                                >
                                  <span className="text-xs">
                                    Bs. {deudaEnBs.toLocaleString('es-VE')}
                                  </span>
                                  <span className="text-[7px]">
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
                                  className="bg-slate-900 text-white p-4 rounded-[1.2rem] font-black uppercase text-[10px] flex flex-col items-center hover:bg-black shadow-lg"
                                >
                                  <span className="text-xs">
                                    $ {deudaPendienteUsd.toFixed(2)}
                                  </span>
                                  <span className="text-[7px]">
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
