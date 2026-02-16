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
  MessageSquare,
  ChevronDown,
  Check,
  Tag,
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);

  // Estados para el cobro
  const [mostrarAbonar, setMostrarAbonar] = useState(false);
  const [tasaDia, setTasaDia] = useState<number>(0);
  const [montoBsRecibido, setMontoBsRecibido] = useState<number>(0);
  const [montoUsdRecibido, setMontoUsdRecibido] = useState<number>(0);
  const [observacion, setObservacion] = useState('');

  const cargarHistorial = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('cotizaciones')
      .select(`*, clientes ( nombre )`)
      .order('created_at', { ascending: false });
    if (data) setCotizaciones(data);
    setCargando(false);
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  // --- LÓGICA DE CAJAS ---
  const hoy = new Date().toISOString().split('T')[0];
  const cajaBsDia = cotizaciones
    .filter((c) => c.created_at.startsWith(hoy))
    .reduce((acc, curr) => acc + (curr.pago_bs_hoy || 0), 0);
  const cajaUsdDia = cotizaciones
    .filter((c) => c.created_at.startsWith(hoy))
    .reduce((acc, curr) => acc + (curr.pago_usd_hoy || 0), 0);

  // --- ACCIÓN: APROBAR COTIZACIÓN ---
  const aprobarCotizacion = async (cot: any) => {
    setProcesandoAccion(true);
    const { error } = await supabase
      .from('cotizaciones')
      .update({ estado: 'aprobado' })
      .eq('id', cot.id);
    if (!error) {
      alert('¡Cotización aprobada!');
      await cargarHistorial();
      setCotizacionSeleccionada({ ...cot, estado: 'aprobado' });
    }
    setProcesandoAccion(false);
  };

  // --- ACCIÓN: REGISTRAR PAGO (Confirmar y Descontar) ---
  const registrarPago = async (
    cot: any,
    usdADescontar: number,
    montoBs: number,
    montoUsd: number,
    tipo: string,
  ) => {
    if (usdADescontar <= 0)
      return alert('El monto a descontar debe ser mayor a 0');

    setProcesandoAccion(true);
    const nuevoTotalPagado = (cot.monto_pagado || 0) + usdADescontar;

    const { error } = await supabase
      .from('cotizaciones')
      .update({
        monto_pagado: nuevoTotalPagado,
        pago_bs_hoy: (cot.pago_bs_hoy || 0) + montoBs,
        pago_usd_hoy: (cot.pago_usd_hoy || 0) + montoUsd,
      })
      .eq('id', cot.id);

    if (!error) {
      await enviarNotificacionTelegram(
        `✅ *${tipo}*\n👤 *Cliente:* ${cot.clientes?.nombre}\n📉 *Descontado:* $${usdADescontar.toFixed(2)}\n💰 *Recibido:* Bs.${montoBs} / $${montoUsd}\n📝 *Nota:* ${observacion || 'S/N'}`,
      );
      setCotizacionSeleccionada(null);
      setMostrarAbonar(false);
      setTasaDia(0);
      setMontoBsRecibido(0);
      setMontoUsdRecibido(0);
      setObservacion('');
      await cargarHistorial();
    } else {
      alert('Error al registrar el pago');
    }
    setProcesandoAccion(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* CAJAS DEL DÍA */}
        <section className="mb-6 grid grid-cols-2 gap-3">
          <div className="bg-emerald-600 p-5 rounded-[2rem] text-white shadow-lg">
            <p className="text-[10px] font-bold uppercase opacity-80">
              Entrada Bs (Hoy)
            </p>
            <h3 className="text-2xl font-black">
              Bs. {cajaBsDia.toLocaleString('es-VE')}
            </h3>
          </div>
          <div className="bg-blue-600 p-5 rounded-[2rem] text-white shadow-lg">
            <p className="text-[10px] font-bold uppercase opacity-80">
              Entrada USD (Hoy)
            </p>
            <h3 className="text-2xl font-black">
              ${cajaUsdDia.toLocaleString()}
            </h3>
          </div>
        </section>

        {/* LISTADO DE TARJETAS */}
        <div className="space-y-3">
          {cotizaciones.map((cot) => {
            const deudaUsd = cot.total - (cot.monto_pagado || 0);
            const estaPagado = deudaUsd <= 0.05;
            const esDolar = cot.moneda === 'USD';

            return (
              <div
                key={cot.id}
                className="bg-white p-4 rounded-[2rem] border border-slate-100 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-2xl ${estaPagado ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {esDolar ? <DollarSign size={18} /> : <Wallet size={18} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-[11px] leading-tight">
                      {cot.clientes?.nombre}
                    </h4>
                    <div className="flex gap-2 mt-1">
                      <span
                        className={`text-[7px] font-black px-1.5 py-0.5 rounded ${cot.tipo_operacion === 'venta_directa' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}
                      >
                        {cot.tipo_operacion === 'venta_directa'
                          ? 'VENTA DIRECTA'
                          : 'COTIZACIÓN'}
                      </span>
                      <span className="text-[7px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded uppercase">
                        {cot.moneda}:{' '}
                        {esDolar
                          ? `$${cot.total}`
                          : `Bs.${(cot.total * cot.tasa_bcv).toLocaleString('es-VE')}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase">
                      Resta
                    </p>
                    <p
                      className={`font-black text-xs ${estaPagado ? 'text-emerald-500' : 'text-red-600'}`}
                    >
                      {estaPagado ? 'PAGADO' : `$${deudaUsd.toFixed(2)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setCotizacionSeleccionada(cot)}
                    className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-700"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL DE DETALLE Y COBRO */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-800">
                    Detalle de Operación
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    {cotizacionSeleccionada.tipo_operacion === 'venta_directa'
                      ? 'Venta Directa'
                      : 'Cotización'}{' '}
                    #{cotizacionSeleccionada.id.toString().slice(-4)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCotizacionSeleccionada(null);
                    setMostrarAbonar(false);
                  }}
                  className="p-2 bg-slate-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Resumen Financiero */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                      Monto Original
                    </p>
                    <p className="text-xs font-black text-slate-700">
                      {cotizacionSeleccionada.moneda === 'USD'
                        ? `$${cotizacionSeleccionada.total}`
                        : `Bs.${(cotizacionSeleccionada.total * cotizacionSeleccionada.tasa_bcv).toLocaleString('es-VE')}`}
                    </p>
                    <p className="text-[9px] text-blue-500 font-bold mt-1 tracking-tighter italic">
                      Tasa Venta: {cotizacionSeleccionada.tasa_bcv} Bs
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-2xl border ${cotizacionSeleccionada.total - (cotizacionSeleccionada.monto_pagado || 0) <= 0.05 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}
                  >
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                      Deuda en Dólares
                    </p>
                    <p
                      className={`text-xl font-black ${cotizacionSeleccionada.total - (cotizacionSeleccionada.monto_pagado || 0) <= 0.05 ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      $
                      {(
                        cotizacionSeleccionada.total -
                        (cotizacionSeleccionada.monto_pagado || 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* LOGICA DE ACCIÓN SEGÚN ESTADO */}
                {cotizacionSeleccionada.estado === 'pendiente' &&
                cotizacionSeleccionada.tipo_operacion === 'cotizacion' ? (
                  <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-200 text-center">
                    <AlertCircle className="mx-auto mb-2 text-amber-500" />
                    <p className="text-[11px] font-bold text-amber-800 mb-4">
                      Esta cotización debe ser aprobada antes de recibir pagos.
                    </p>
                    <button
                      onClick={() => aprobarCotizacion(cotizacionSeleccionada)}
                      disabled={procesandoAccion}
                      className="w-full bg-amber-500 text-white p-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-amber-200 disabled:opacity-50"
                    >
                      {procesandoAccion ? 'Aprobando...' : 'Aprobar Cotización'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Si ya está pagado no mostramos botones */}
                    {cotizacionSeleccionada.total -
                      (cotizacionSeleccionada.monto_pagado || 0) <=
                    0.05 ? (
                      <div className="p-6 bg-emerald-50 rounded-[2rem] text-center border border-emerald-100">
                        <CheckCircle2
                          className="mx-auto text-emerald-500 mb-2"
                          size={30}
                        />
                        <p className="font-black text-emerald-800 text-xs uppercase tracking-widest">
                          Cuenta Solventada
                        </p>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            registrarPago(
                              cotizacionSeleccionada,
                              cotizacionSeleccionada.total -
                                (cotizacionSeleccionada.monto_pagado || 0),
                              0,
                              cotizacionSeleccionada.total -
                                (cotizacionSeleccionada.monto_pagado || 0),
                              'Pago Completo',
                            )
                          }
                          className="w-full bg-emerald-500 text-white p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"
                        >
                          <Check size={16} /> Liquidar Deuda Completa
                        </button>

                        <button
                          onClick={() => setMostrarAbonar(!mostrarAbonar)}
                          className="w-full bg-slate-100 text-slate-600 p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"
                        >
                          {mostrarAbonar ? 'Cancelar' : 'Registrar Abono'}{' '}
                          <ChevronDown
                            size={16}
                            className={mostrarAbonar ? 'rotate-180' : ''}
                          />
                        </button>

                        {mostrarAbonar && (
                          <div className="space-y-4 p-5 bg-slate-50 rounded-[2rem] border border-slate-200">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-500 ml-2 uppercase">
                                Tasa del Dólar Hoy (BCV)
                              </label>
                              <input
                                type="number"
                                placeholder="Ej: 54.20"
                                className="w-full p-3 rounded-xl border-none ring-1 ring-slate-200 font-black"
                                onChange={(e) =>
                                  setTasaDia(parseFloat(e.target.value) || 0)
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-black text-emerald-600 ml-2 uppercase">
                                  Recibí en Bs
                                </label>
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  className="w-full p-3 rounded-xl border-none ring-1 ring-emerald-200 font-black"
                                  onChange={(e) =>
                                    setMontoBsRecibido(
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-blue-600 ml-2 uppercase">
                                  Recibí en $
                                </label>
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  className="w-full p-3 rounded-xl border-none ring-1 ring-blue-200 font-black"
                                  onChange={(e) =>
                                    setMontoUsdRecibido(
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                            </div>

                            {(montoBsRecibido > 0 || montoUsdRecibido > 0) && (
                              <div className="p-4 bg-slate-900 rounded-2xl text-white flex justify-between items-center shadow-lg">
                                <span className="text-[10px] font-bold uppercase opacity-60">
                                  Se descuenta de la deuda:
                                </span>
                                <span className="text-xl font-black text-emerald-400">
                                  -$
                                  {(
                                    montoBsRecibido / (tasaDia || 1) +
                                    montoUsdRecibido
                                  ).toFixed(2)}
                                </span>
                              </div>
                            )}

                            <button
                              onClick={() => {
                                const descuento =
                                  montoBsRecibido / (tasaDia || 1) +
                                  montoUsdRecibido;
                                registrarPago(
                                  cotizacionSeleccionada,
                                  descuento,
                                  montoBsRecibido,
                                  montoUsdRecibido,
                                  'Abono Parcial',
                                );
                              }}
                              disabled={
                                procesandoAccion ||
                                (!montoBsRecibido && !montoUsdRecibido) ||
                                (montoBsRecibido > 0 && tasaDia <= 0)
                              }
                              className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-xs shadow-xl disabled:opacity-30"
                            >
                              Confirmar y Descontar
                            </button>
                          </div>
                        )}
                      </>
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
