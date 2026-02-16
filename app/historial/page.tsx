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
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);

  const [mostrarAbonar, setMostrarAbonar] = useState(false);
  const [tasaDia, setTasaDia] = useState<number>(0);
  const [montoBsRecibido, setMontoBsRecibido] = useState<number>(0);
  const [montoUsdRecibido, setMontoUsdRecibido] = useState<number>(0);
  const [observacion, setObservacion] = useState('');

  const cargarHistorial = async () => {
    const { data } = await supabase
      .from('cotizaciones')
      .select(`*, clientes ( nombre )`)
      .order('created_at', { ascending: false });
    if (data) setCotizaciones(data);
    setCargando(false);
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  // --- LÓGICA DE CAJAS (Incluye Abonos y Ventas) ---
  const hoy = new Date().toISOString().split('T')[0];

  // 1. Caja en Bolívares: Suma todo lo recibido en Bs hoy
  const cajaBsDia = cotizaciones
    .filter((c) => c.created_at.startsWith(hoy))
    .reduce((acc, curr) => acc + (curr.pago_bs_hoy || 0), 0);

  // 2. Caja en Dólares: Suma todo lo recibido en USD hoy
  const cajaUsdDia = cotizaciones
    .filter((c) => c.created_at.startsWith(hoy))
    .reduce((acc, curr) => acc + (curr.pago_usd_hoy || 0), 0);

  // --- ACCIÓN: REGISTRAR PAGO ---
  const registrarPago = async (
    cot: any,
    usdADescontar: number,
    montoBs: number,
    montoUsd: number,
    tipo: string,
  ) => {
    if (usdADescontar > cot.total - cot.monto_pagado + 0.01) {
      alert('El monto supera la deuda actual');
      return;
    }

    setProcesandoAccion(true);
    const nuevoTotalPagado = (cot.monto_pagado || 0) + usdADescontar;

    // IMPORTANTE: Aquí deberías tener columnas para registrar el ingreso del día
    // o una tabla aparte de 'pagos'. Por ahora actualizamos la cotización.
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
        `✅ *${tipo}*\n👤 *Cliente:* ${cot.clientes?.nombre}\n💵 *Descontado:* $${usdADescontar.toFixed(2)}\n💰 *Recibido:* Bs.${montoBs} / $${montoUsd}\n📉 *Saldo:* $${(cot.total - nuevoTotalPagado).toFixed(2)}`,
      );
      setCotizacionSeleccionada(null);
      setMostrarAbonar(false);
      resetCampos();
      cargarHistorial();
    }
    setProcesandoAccion(false);
  };

  const resetCampos = () => {
    setTasaDia(0);
    setMontoBsRecibido(0);
    setMontoUsdRecibido(0);
    setObservacion('');
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* CAJAS DEL DÍA */}
        <section className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-emerald-600 p-4 rounded-3xl text-white shadow-lg">
            <p className="text-[10px] font-bold uppercase opacity-80">
              Entrada Bs (Hoy)
            </p>
            <h3 className="text-xl font-black">
              Bs. {cajaBsDia.toLocaleString('es-VE')}
            </h3>
          </div>
          <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-lg">
            <p className="text-[10px] font-bold uppercase opacity-80">
              Entrada USD (Hoy)
            </p>
            <h3 className="text-xl font-black">
              ${cajaUsdDia.toLocaleString()}
            </h3>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-200 hidden md:block">
            <p className="text-[10px] font-black text-slate-400 uppercase">
              Por Cobrar
            </p>
            <h3 className="text-xl font-black text-red-600">
              $
              {cotizaciones
                .reduce(
                  (acc, curr) => acc + (curr.total - (curr.monto_pagado || 0)),
                  0,
                )
                .toFixed(2)}
            </h3>
          </div>
        </section>

        {/* LISTADO */}
        <div className="space-y-3">
          {cotizaciones.map((cot) => {
            const deudaUsd = cot.total - (cot.monto_pagado || 0);
            const estaPagado = deudaUsd <= 0.05;

            return (
              <div
                key={cot.id}
                className="bg-white p-4 rounded-[2rem] border border-slate-100 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-2xl ${estaPagado ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-500'}`}
                  >
                    {estaPagado ? <Check size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-[11px]">
                      {cot.clientes?.nombre}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-bold">
                      Venta: Bs.{' '}
                      {(cot.total * cot.tasa_bcv).toLocaleString('es-VE')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Deuda
                    </p>
                    <p
                      className={`font-black text-sm ${estaPagado ? 'text-emerald-500' : 'text-red-600'}`}
                    >
                      {estaPagado ? 'PAGADO' : `$${deudaUsd.toFixed(2)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setCotizacionSeleccionada(cot)}
                    className="p-3 bg-slate-900 text-white rounded-xl"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL CORREGIDO */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center bg-white">
                <h3 className="font-black uppercase text-slate-800 tracking-tight">
                  Detalle del Cliente
                </h3>
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

              <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Info Venta */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Tasa de Venta
                    </p>
                    <p className="font-black text-blue-600">
                      {cotizacionSeleccionada.tasa_bcv} Bs/$
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-2xl border text-center ${cotizacionSeleccionada.total - cotizacionSeleccionada.monto_pagado <= 0.05 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}
                  >
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Deuda Actual
                    </p>
                    <p
                      className={`text-lg font-black ${cotizacionSeleccionada.total - cotizacionSeleccionada.monto_pagado <= 0.05 ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      $
                      {(
                        cotizacionSeleccionada.total -
                        (cotizacionSeleccionada.monto_pagado || 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* LOGICA DE BOTONES */}
                {cotizacionSeleccionada.total -
                  (cotizacionSeleccionada.monto_pagado || 0) <=
                0.05 ? (
                  <div className="p-8 text-center bg-emerald-50 rounded-3xl border border-emerald-200">
                    <CheckCircle2
                      className="mx-auto text-emerald-500 mb-2"
                      size={40}
                    />
                    <p className="font-black text-emerald-800 uppercase text-sm tracking-widest">
                      Cuenta Solventada
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() =>
                        registrarPago(
                          cotizacionSeleccionada,
                          cotizacionSeleccionada.total -
                            cotizacionSeleccionada.monto_pagado,
                          0,
                          cotizacionSeleccionada.total -
                            cotizacionSeleccionada.monto_pagado,
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
                      {mostrarAbonar ? 'Cerrar calculadora' : 'Registrar Abono'}{' '}
                      <ChevronDown
                        size={16}
                        className={mostrarAbonar ? 'rotate-180' : ''}
                      />
                    </button>

                    {mostrarAbonar && (
                      <div className="space-y-4 p-5 bg-slate-50 rounded-[2rem] border border-slate-200 animate-in slide-in-from-top-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 ml-2">
                            ¿A CUÁNTO ESTÁ EL DÓLAR HOY?
                          </label>
                          <input
                            type="number"
                            placeholder="Ej: 54.20"
                            className="w-full p-3 rounded-xl border-none ring-1 ring-slate-200 font-black text-lg shadow-sm"
                            onChange={(e) =>
                              setTasaDia(parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-black text-emerald-600 ml-2">
                              RECIBÍ EN BS.
                            </label>
                            <input
                              type="number"
                              placeholder="0.00"
                              className="w-full p-3 rounded-xl border-none ring-1 ring-emerald-200 font-black shadow-sm"
                              onChange={(e) =>
                                setMontoBsRecibido(
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-blue-600 ml-2">
                              RECIBÍ EN $
                            </label>
                            <input
                              type="number"
                              placeholder="0.00"
                              className="w-full p-3 rounded-xl border-none ring-1 ring-blue-200 font-black shadow-sm"
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
                            <span className="text-[10px] font-bold uppercase opacity-60 italic">
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
                            (!montoBsRecibido && !montoUsdRecibido) ||
                            (montoBsRecibido > 0 && tasaDia <= 0)
                          }
                          className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-xs shadow-xl disabled:opacity-30"
                        >
                          Confirmar y Descontar
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
