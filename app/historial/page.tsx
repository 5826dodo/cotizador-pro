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
  RefreshCcw,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);

  // Estados de control de interfaz
  const [mostrarAbonar, setMostrarAbonar] = useState(false);
  const [tasaDia, setTasaDia] = useState<number>(0);
  const [montoBsRecibido, setMontoBsRecibido] = useState<number>(0);
  const [montoUsdRecibido, setMontoUsdRecibido] = useState<number>(0);
  const [observacion, setObservacion] = useState('');

  const cargarHistorial = async () => {
    const { data } = await supabase
      .from('cotizaciones')
      .select(`*, clientes ( nombre, empresa )`)
      .order('created_at', { ascending: false });
    if (data) setCotizaciones(data);
    setCargando(false);
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  // --- ACCIÓN: APROBAR COTIZACIÓN ---
  const aprobarCotizacion = async (cot: any) => {
    setProcesandoAccion(true);
    const { error } = await supabase
      .from('cotizaciones')
      .update({ estado: 'aprobado' })
      .eq('id', cot.id);
    if (!error) {
      alert('Cotización aprobada correctamente');
      cargarHistorial();
      setCotizacionSeleccionada({ ...cot, estado: 'aprobado' });
    }
    setProcesandoAccion(false);
  };

  // --- ACCIÓN: REGISTRAR PAGO ---
  const registrarPago = async (
    cot: any,
    usdAmortizados: number,
    tipo: string,
  ) => {
    setProcesandoAccion(true);
    const nuevoTotalPagado = (cot.monto_pagado || 0) + usdAmortizados;
    const { error } = await supabase
      .from('cotizaciones')
      .update({ monto_pagado: nuevoTotalPagado })
      .eq('id', cot.id);

    if (!error) {
      await enviarNotificacionTelegram(
        `💰 *${tipo}*\n👤 *Cliente:* ${cot.clientes?.nombre}\n💵 *Amortizado:* $${usdAmortizados.toFixed(2)}\n📉 *Saldo:* $${(cot.total - nuevoTotalPagado).toFixed(2)}\n📝 *Nota:* ${observacion}`,
      );
      setCotizacionSeleccionada(null);
      setMostrarAbonar(false);
      cargarHistorial();
    }
    setProcesandoAccion(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* LISTADO DE TARJETAS */}
        <div className="space-y-3">
          {cotizaciones.map((cot) => {
            const deudaUsd = cot.total - (cot.monto_pagado || 0);
            const estaPagado = deudaUsd <= 0.01;
            return (
              <div
                key={cot.id}
                className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-2xl ${estaPagado ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-400'}`}
                  >
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-[11px] leading-tight">
                      {cot.clientes?.nombre}
                    </h4>
                    <span
                      className={`text-[8px] font-black px-2 py-0.5 rounded mt-1 inline-block ${cot.tipo_operacion === 'venta_directa' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}
                    >
                      {cot.tipo_operacion === 'venta_directa'
                        ? 'VENTA DIRECTA'
                        : 'COTIZACIÓN'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Saldo
                    </p>
                    <p
                      className={`font-black text-xs ${estaPagado ? 'text-emerald-500' : 'text-red-600'}`}
                    >
                      ${deudaUsd.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCotizacionSeleccionada(cot);
                      setMostrarAbonar(false);
                    }}
                    className="p-3 bg-slate-900 text-white rounded-xl"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL RESPONSIVO */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] max-h-[95vh] overflow-y-auto shadow-2xl">
              {/* Header Modal */}
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-lg font-black uppercase text-slate-800">
                    Detalle de Cobro
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400">
                    {cotizacionSeleccionada.clientes?.nombre}
                  </p>
                </div>
                <button
                  onClick={() => setCotizacionSeleccionada(null)}
                  className="p-2 bg-slate-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Resumen de Venta */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                      Total Venta (Bs)
                    </p>
                    <p className="text-sm font-black text-slate-700">
                      Bs.{' '}
                      {(
                        cotizacionSeleccionada.total *
                        cotizacionSeleccionada.tasa_bcv
                      ).toLocaleString('es-VE')}
                    </p>
                    <p className="text-[9px] text-blue-500 font-bold">
                      @ {cotizacionSeleccionada.tasa_bcv} Bs/$
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-2xl border ${cotizacionSeleccionada.total - (cotizacionSeleccionada.monto_pagado || 0) <= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}
                  >
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                      Resta por Cobrar ($)
                    </p>
                    <p
                      className={`text-xl font-black ${cotizacionSeleccionada.total - (cotizacionSeleccionada.monto_pagado || 0) <= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      $
                      {(
                        cotizacionSeleccionada.total -
                        (cotizacionSeleccionada.monto_pagado || 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* LOGICA DE ACCIONES */}
                {cotizacionSeleccionada.estado === 'pendiente' ? (
                  <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200 text-center">
                    <AlertCircle className="mx-auto mb-2 text-amber-500" />
                    <p className="text-xs font-bold text-amber-800 mb-4">
                      Esta cotización debe ser aprobada para procesar pagos.
                    </p>
                    <button
                      onClick={() => aprobarCotizacion(cotizacionSeleccionada)}
                      className="w-full bg-amber-500 text-white p-4 rounded-2xl font-black uppercase text-xs"
                    >
                      Aprobar Ahora
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Botones principales */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() =>
                          registrarPago(
                            cotizacionSeleccionada,
                            cotizacionSeleccionada.total -
                              (cotizacionSeleccionada.monto_pagado || 0),
                            'Pago Completo',
                          )
                        }
                        className="w-full bg-emerald-500 text-white p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={16} /> Liquidar Deuda Completa
                      </button>
                      <button
                        onClick={() => setMostrarAbonar(!mostrarAbonar)}
                        className="w-full bg-slate-100 text-slate-600 p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"
                      >
                        {mostrarAbonar
                          ? 'Cancelar Abono'
                          : 'Registrar Abono Parcial'}{' '}
                        <ChevronDown
                          size={16}
                          className={mostrarAbonar ? 'rotate-180' : ''}
                        />
                      </button>
                    </div>

                    {/* Sección de Abono Expandible */}
                    {mostrarAbonar && (
                      <div className="space-y-4 p-4 bg-slate-50 rounded-3xl border border-slate-200 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="bg-white p-3 rounded-xl shadow-sm">
                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                              Tasa de Hoy (BCV)
                            </label>
                            <input
                              type="number"
                              placeholder="Ej: 54.20"
                              className="w-full font-black text-lg outline-none"
                              onChange={(e) =>
                                setTasaDia(parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="bg-white p-3 rounded-xl shadow-sm">
                            <label className="text-[9px] font-black text-emerald-500 uppercase block mb-1">
                              Recibido en Bs
                            </label>
                            <input
                              type="number"
                              placeholder="Monto Bs."
                              className="w-full font-black text-lg outline-none"
                              onChange={(e) =>
                                setMontoBsRecibido(
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                          <div className="bg-white p-3 rounded-xl shadow-sm">
                            <label className="text-[9px] font-black text-blue-500 uppercase block mb-1">
                              Recibido en $ (Efectivo)
                            </label>
                            <input
                              type="number"
                              placeholder="Monto $"
                              className="w-full font-black text-lg outline-none"
                              onChange={(e) =>
                                setMontoUsdRecibido(
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                        </div>

                        {/* Resultado Amortización */}
                        {((tasaDia > 0 && montoBsRecibido > 0) ||
                          montoUsdRecibido > 0) && (
                          <div className="p-3 bg-slate-900 rounded-xl text-white flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase">
                              Resta de la deuda:
                            </span>
                            <span className="text-lg font-black text-emerald-400">
                              -$
                              {(
                                montoBsRecibido / (tasaDia || 1) +
                                montoUsdRecibido
                              ).toFixed(2)}
                            </span>
                          </div>
                        )}

                        <div className="bg-white p-3 rounded-xl flex items-center gap-2">
                          <MessageSquare size={16} className="text-slate-300" />
                          <input
                            type="text"
                            placeholder="Nota (Ej: Pago móvil Banesco)"
                            className="text-xs font-bold w-full outline-none"
                            onChange={(e) => setObservacion(e.target.value)}
                          />
                        </div>

                        <button
                          onClick={() =>
                            registrarPago(
                              cotizacionSeleccionada,
                              montoBsRecibido / tasaDia + montoUsdRecibido,
                              'Abono Parcial',
                            )
                          }
                          disabled={
                            (!montoBsRecibido && !montoUsdRecibido) ||
                            (montoBsRecibido > 0 && !tasaDia)
                          }
                          className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-100"
                        >
                          Confirmar Abono
                        </button>
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
