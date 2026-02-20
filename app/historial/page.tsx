'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { enviarNotificacionTelegram } from '../../lib/telegram';
import {
  X,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  Wallet,
  Clock,
  Check,
  Calendar,
  TrendingUp,
  ChevronDown,
  User, // <--- Agrega este
  ShoppingCart, // <--- Agrega este
} from 'lucide-react';

export default function HistorialPage() {
  // --- ESTADOS ---
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);
  const [mostrarAbonar, setMostrarAbonar] = useState(false);

  // Estados para el formulario de pago
  const [tasaDia, setTasaDia] = useState<number>(0);
  const [montoBsRecibido, setMontoBsRecibido] = useState<number>(0);
  const [montoUsdRecibido, setMontoUsdRecibido] = useState<number>(0);

  // Estado para el cierre de caja del día
  const [cajasHoy, setCajasHoy] = useState({ bs: 0, usd: 0 });

  // --- CARGA DE DATOS ---
  const cargarDatos = async () => {
    setCargando(true);
    try {
      // 1. Obtener Cotizaciones y Ventas
      const { data: cots } = await supabase
        .from('cotizaciones')
        .select(`*, clientes ( nombre, empresa )`)
        .order('created_at', { ascending: false });
      if (cots) setCotizaciones(cots);

      // 2. Cargar Pagos del día (Cierre de Caja)
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const { data: pagos } = await supabase
        .from('pagos_registrados')
        .select('monto_bs, monto_usd')
        .gte('created_at', hoy.toISOString());

      if (pagos) {
        const totales = pagos.reduce(
          (acc, p) => ({
            bs: acc.bs + Number(p.monto_bs || 0),
            usd: acc.usd + Number(p.monto_usd || 0),
          }),
          { bs: 0, usd: 0 },
        );
        setCajasHoy(totales);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // --- FUNCIONES DE AYUDA ---
  const formatearFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // --- LÓGICA: APROBAR Y DESCONTAR STOCK ---
  const aprobarOperacion = async (cot: any) => {
    setProcesandoAccion(true);
    try {
      const productos = cot.productos_seleccionados || [];
      for (const item of productos) {
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

      alert('✅ Operación Aprobada e Inventario Actualizado');
      cargarDatos();
      setCotizacionSeleccionada(null);
    } catch (error) {
      alert('Error al aprobar');
    }
    setProcesandoAccion(false);
  };

  // --- LÓGICA: REGISTRAR PAGO (CAJA) ---
  const registrarPago = async (
    cot: any,
    usdEquivalente: number,
    tipo: string,
  ) => {
    const deudaActualUsd = cot.total - (cot.monto_pagado || 0);

    // Validación de sobrepago
    if (usdEquivalente > deudaActualUsd + 0.05) {
      alert(
        `⚠️ Monto ($${usdEquivalente.toFixed(2)}) excede la deuda ($${deudaActualUsd.toFixed(2)})`,
      );
      return;
    }

    setProcesandoAccion(true);
    try {
      // Registrar en caja
      await supabase.from('pagos_registrados').insert([
        {
          cotizacion_id: cot.id,
          monto_bs: montoBsRecibido,
          monto_usd: montoUsdRecibido,
          tasa_aplicada: tasaDia || cot.tasa_bcv,
          observacion: tipo,
        },
      ]);

      // Actualizar cotización
      const nuevoTotalPagado = (cot.monto_pagado || 0) + usdEquivalente;
      await supabase
        .from('cotizaciones')
        .update({
          monto_pagado: nuevoTotalPagado,
          estado_pago:
            nuevoTotalPagado >= cot.total - 0.05 ? 'pagado' : 'parcial',
        })
        .eq('id', cot.id);

      alert('✅ Pago registrado correctamente');
      setCotizacionSeleccionada(null);
      setMostrarAbonar(false);
      cargarDatos();
    } catch (error) {
      alert('Error al procesar pago');
    }
    setProcesandoAccion(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* SECCIÓN CAJAS (CIERRE) */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100">
            <p className="text-[10px] font-black uppercase opacity-70">
              Caja Bolívares Hoy
            </p>
            <h3 className="text-3xl font-black">
              Bs. {cajasHoy.bs.toLocaleString('es-VE')}
            </h3>
          </div>
          <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl shadow-slate-200">
            <p className="text-[10px] font-black uppercase opacity-70">
              Caja Dólares Hoy
            </p>
            <h3 className="text-3xl font-black">
              ${cajasHoy.usd.toLocaleString()}
            </h3>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-orange-100">
            <p className="text-[10px] font-black text-slate-400 uppercase">
              Por Cobrar (Aprobadas)
            </p>
            <h3 className="text-3xl font-black text-red-600">
              $
              {cotizaciones
                .filter((c) => c.estado === 'aprobado')
                .reduce(
                  (acc, curr) => acc + (curr.total - (curr.monto_pagado || 0)),
                  0,
                )
                .toFixed(2)}
            </h3>
          </div>
        </section>

        {/* FILTRO BUSQUEDA */}
        <input
          type="text"
          placeholder="Buscar cliente..."
          className="w-full p-4 mb-8 rounded-2xl border-none ring-2 ring-slate-100 focus:ring-emerald-500 font-bold outline-none shadow-sm transition-all"
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {/* LISTADO DE REGISTROS */}
        <div className="space-y-4">
          {cotizaciones
            .filter((c) =>
              c.clientes?.nombre
                ?.toLowerCase()
                .includes(busqueda.toLowerCase()),
            )
            .map((cot) => {
              const esBS = cot.moneda === 'BS' || cot.moneda === 'Bs';
              const deudaUsd = cot.total - (cot.monto_pagado || 0);
              const estaPagado = deudaUsd <= 0.05;
              const tasa = cot.tasa_bcv || 1;
              const esAprobada = cot.estado === 'aprobado';

              return (
                <div
                  key={cot.id}
                  className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-slate-50 hover:border-orange-100 transition-all mb-4"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    {/* INFO CLIENTE */}
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-900 p-4 rounded-[1.5rem] shadow-lg shadow-slate-200">
                        <User className="text-orange-500" size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          Cliente
                        </p>
                        <h3 className="text-xl font-black text-slate-800 italic uppercase tracking-tighter">
                          {cot.clientes?.nombre} {cot.clientes?.apellido}
                        </h3>
                        <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                          ID: {cot.clientes?.cedula || 'N/A'}
                        </span>
                        {/* FECHA AGREGADA AQUÍ */}
                        <span className="text-[10px] font-black text-orange-600/70 italic">
                          {new Date(cot.created_at).toLocaleDateString('es-VE')}
                        </span>
                      </div>
                    </div>

                    {/* MONTOS Y ESTADOS */}
                    <div className="grid grid-cols-2 md:flex md:items-center gap-8 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                      {/* TOTAL VENTA */}
                      <div className="text-left md:text-right">
                        <span
                          className={`text-[8px] px-2 py-0.5 rounded-full font-black text-white uppercase mb-1 inline-block ${cot.tipo_operacion === 'venta_directa' ? 'bg-orange-600' : 'bg-blue-600'}`}
                        >
                          {cot.tipo_operacion === 'venta_directa'
                            ? 'Venta Directa'
                            : 'Cotización'}
                        </span>
                        <p className="text-[9px] font-black text-slate-400 uppercase italic">
                          Monto Total
                        </p>
                        <p className="font-black text-lg text-slate-900 leading-none">
                          {cot.moneda === 'BS'
                            ? `Bs. ${(cot.total * cot.tasa_bcv).toLocaleString('es-VE')}`
                            : `$${cot.total.toFixed(2)}`}
                        </p>
                      </div>

                      {/* DEUDA EN ROJO VENTIQ */}
                      <div className="text-right border-l-2 border-orange-100 pl-6">
                        <p className="text-[9px] font-black text-red-400 uppercase italic">
                          Saldo Pendiente
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

                      {/* ACCIÓN */}
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
            })}
        </div>

        {/* MODAL DE GESTIÓN */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
              {/* CABECERA ESTILO VENTIQ DARK */}
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
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Tasa: {cotizacionSeleccionada.tasa_bcv}
                    </p>
                    {/* FECHA EN EL MODAL */}
                    <span className="ml-1 text-slate-300">
                      {new Date(
                        cotizacionSeleccionada.created_at,
                      ).toLocaleDateString('es-VE')}
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
                  className="p-3 bg-white/10 rounded-2xl hover:bg-red-500 transition-all text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* CUERPO DEL MODAL */}
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scroll">
                {/* LISTA DE PRODUCTOS (REDISEÑADA) */}
                <div className="bg-slate-50 rounded-[2rem] p-5 border-2 border-slate-100">
                  <details className="group">
                    <summary className="list-none flex justify-between items-center cursor-pointer">
                      <div className="flex items-center gap-2 text-slate-500">
                        <ShoppingCart size={14} />
                        <span className="text-[10px] font-black uppercase italic tracking-widest">
                          Detalle del Pedido (
                          {
                            cotizacionSeleccionada.productos_seleccionados
                              ?.length
                          }
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

                {/* LÓGICA DE COBRO */}
                {cotizacionSeleccionada.estado === 'pendiente' ? (
                  <div className="p-8 bg-amber-50 rounded-[2.5rem] border-2 border-dashed border-amber-200 text-center">
                    <AlertCircle
                      className="mx-auto mb-3 text-amber-500"
                      size={32}
                    />
                    <p className="text-sm font-black text-amber-800 uppercase mb-4 italic">
                      Aprobación requerida para cobros
                    </p>
                    <button
                      onClick={() => aprobarOperacion(cotizacionSeleccionada)}
                      className="w-full bg-amber-500 text-white p-5 rounded-[1.5rem] font-black uppercase text-xs shadow-xl shadow-amber-200 hover:scale-[1.02] transition-transform"
                    >
                      Aprobar Ahora
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* CARDS DE SALDO */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100 shadow-sm">
                        <p className="text-[9px] font-black text-emerald-400 uppercase italic mb-1">
                          Pagado
                        </p>
                        <p className="text-lg font-black text-emerald-700 leading-none">
                          {cotizacionSeleccionada.moneda === 'BS'
                            ? `Bs. ${(cotizacionSeleccionada.monto_pagado * cotizacionSeleccionada.tasa_bcv).toLocaleString('es-VE')}`
                            : `$${(cotizacionSeleccionada.monto_pagado || 0).toFixed(2)}`}
                        </p>
                      </div>
                      <div className="p-5 bg-red-50 rounded-[2rem] border border-red-100 shadow-sm">
                        <p className="text-[9px] font-black text-red-400 uppercase italic mb-1 tracking-tighter">
                          Deuda Pendiente
                        </p>
                        <p className="text-lg font-black text-red-600 leading-none">
                          {cotizacionSeleccionada.moneda === 'BS'
                            ? `Bs. ${((cotizacionSeleccionada.total - (cotizacionSeleccionada.monto_pagado || 0)) * cotizacionSeleccionada.tasa_bcv).toLocaleString('es-VE')}`
                            : `$${(cotizacionSeleccionada.total - (cotizacionSeleccionada.monto_pagado || 0)).toFixed(2)}`}
                        </p>
                      </div>
                    </div>

                    {/* INTERFAZ DE ABONO */}
                    {cotizacionSeleccionada.total -
                      (cotizacionSeleccionada.monto_pagado || 0) >
                    0.05 ? (
                      <div className="space-y-4">
                        <button
                          onClick={() => setMostrarAbonar(!mostrarAbonar)}
                          className="w-full bg-slate-900 text-white p-5 rounded-[1.5rem] font-black uppercase text-xs flex justify-center items-center gap-3 shadow-xl"
                        >
                          {mostrarAbonar
                            ? 'Cerrar Registro'
                            : 'Registrar Pago / Abono'}
                          <ChevronDown
                            size={18}
                            className={`transition-transform duration-300 ${mostrarAbonar ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {mostrarAbonar && (
                          <div className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
                            {/* INPUTS DE MONTO */}
                            <div className="grid grid-cols-1 gap-4">
                              <div className="relative">
                                <label className="text-[9px] font-black uppercase text-slate-400 absolute -top-2 left-4 bg-white px-2">
                                  Tasa de Cambio
                                </label>
                                <input
                                  type="number"
                                  className="w-full p-4 rounded-[1.2rem] border-2 border-slate-100 font-black text-slate-700 focus:border-orange-500 outline-none transition-colors"
                                  placeholder="Tasa del día"
                                  value={tasaDia}
                                  onChange={(e) =>
                                    setTasaDia(parseFloat(e.target.value) || 0)
                                  }
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  type="number"
                                  className="p-4 rounded-[1.2rem] border-2 border-emerald-100 font-black text-emerald-600 outline-none focus:ring-2 ring-emerald-500"
                                  placeholder="Abono Bs"
                                  onChange={(e) =>
                                    setMontoBsRecibido(
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                                <input
                                  type="number"
                                  className="p-4 rounded-[1.2rem] border-2 border-blue-100 font-black text-blue-600 outline-none focus:ring-2 ring-blue-500"
                                  placeholder="Abono $"
                                  onChange={(e) =>
                                    setMontoUsdRecibido(
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                            </div>

                            {/* BOTÓN CONFIRMAR CON VALIDACIÓN */}
                            <button
                              disabled={
                                montoBsRecibido <= 0 && montoUsdRecibido <= 0
                              }
                              onClick={() =>
                                registrarPago(
                                  cotizacionSeleccionada,
                                  montoUsdRecibido +
                                    montoBsRecibido /
                                      (tasaDia ||
                                        cotizacionSeleccionada.tasa_bcv),
                                  'Abono Parcial',
                                )
                              }
                              className={`w-full p-5 rounded-[1.5rem] font-black uppercase text-xs shadow-lg transition-all ${
                                montoBsRecibido > 0 || montoUsdRecibido > 0
                                  ? 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                              }`}
                            >
                              {montoBsRecibido > 0 || montoUsdRecibido > 0
                                ? 'Confirmar y Procesar Abono'
                                : 'Ingrese un monto para abonar'}
                            </button>

                            <div className="relative py-2">
                              <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-200"></span>
                              </div>
                              <div className="relative flex justify-center text-[8px] uppercase font-black text-slate-400">
                                <span className="bg-slate-50 px-2 italic">
                                  Liquidar Deuda Total en:
                                </span>
                              </div>
                            </div>

                            {/* LIQUIDACIÓN RÁPIDA POR MONEDA */}
                            {/* LIQUIDACIÓN RÁPIDA POR MONEDA */}
                            <div className="grid grid-cols-2 gap-3">
                              {/* LIQUIDAR EN BOLÍVARES (Depende de la tasa ingresada) */}
                              <button
                                onClick={() => {
                                  const tasaUsar =
                                    tasaDia || cotizacionSeleccionada.tasa_bcv;
                                  const saldoUsd =
                                    cotizacionSeleccionada.total -
                                    (cotizacionSeleccionada.monto_pagado || 0);
                                  const montoBsReal = (
                                    saldoUsd * tasaUsar
                                  ).toLocaleString('es-VE');

                                  registrarPago(
                                    cotizacionSeleccionada,
                                    saldoUsd,
                                    `Liquidación Total en Bs (Tasa: ${tasaUsar}) - Recibido: Bs. ${montoBsReal}`,
                                  );
                                }}
                                className="bg-white border-2 border-emerald-500 text-emerald-600 p-4 rounded-[1.2rem] font-black uppercase text-[9px] flex flex-col items-center justify-center gap-1 hover:bg-emerald-50 transition-colors shadow-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">🇻🇪</span>
                                  <span>Bs. Total</span>
                                </div>
                                <span className="text-[7px] opacity-70 italic text-emerald-800">
                                  Usa Tasa:{' '}
                                  {tasaDia || cotizacionSeleccionada.tasa_bcv}
                                </span>
                              </button>

                              {/* LIQUIDAR EN DÓLARES (No depende de la tasa) */}
                              <button
                                onClick={() => {
                                  const saldoUsd =
                                    cotizacionSeleccionada.total -
                                    (cotizacionSeleccionada.monto_pagado || 0);
                                  registrarPago(
                                    cotizacionSeleccionada,
                                    saldoUsd,
                                    'Liquidación Total en Dólares (Efectivo/Zelle)',
                                  );
                                }}
                                className="bg-slate-900 text-white p-4 rounded-[1.2rem] font-black uppercase text-[9px] flex flex-col items-center justify-center gap-1 hover:bg-black transition-colors shadow-lg"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">💵</span>
                                  <span>$. Total</span>
                                </div>
                                <span className="text-[7px] opacity-70 italic text-slate-400">
                                  Monto: $
                                  {(
                                    cotizacionSeleccionada.total -
                                    (cotizacionSeleccionada.monto_pagado || 0)
                                  ).toFixed(2)}
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
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
      </div>
    </main>
  );
}
