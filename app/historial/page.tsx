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
  ChevronDown,
  Check,
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);

  const [mostrarAbonar, setMostrarAbonar] = useState(false);
  const [tasaDia, setTasaDia] = useState<number>(0);
  const [montoBsRecibido, setMontoBsRecibido] = useState<number>(0);
  const [montoUsdRecibido, setMontoUsdRecibido] = useState<number>(0);
  const [observacion, setObservacion] = useState('');

  const [cajasHoy, setCajasHoy] = useState({ bs: 0, usd: 0 });

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data: cots } = await supabase
        .from('cotizaciones')
        .select(`*, clientes ( nombre, empresa )`)
        .order('created_at', { ascending: false });
      if (cots) setCotizaciones(cots);

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
      console.error(error);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const aprobarOperacion = async (cot: any) => {
    setProcesandoAccion(true);
    try {
      const productos = cot.productos_seleccionados || [];
      for (const item of productos) {
        const { data: prodActual } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.id)
          .single();
        if (prodActual) {
          await supabase
            .from('productos')
            .update({ stock: prodActual.stock - item.cantidad })
            .eq('id', item.id);
        }
      }
      const { error } = await supabase
        .from('cotizaciones')
        .update({
          estado: 'aprobado',
          fecha_aprobacion: new Date().toISOString(),
        })
        .eq('id', cot.id);

      if (!error) {
        alert('✅ Aprobada e inventario actualizado');
        cargarDatos();
        setCotizacionSeleccionada(null);
      }
    } catch (error) {
      alert('Error al aprobar');
    }
    setProcesandoAccion(false);
  };

  const registrarPago = async (
    cot: any,
    usdEquivalente: number,
    tipo: string,
  ) => {
    const deudaActual = cot.total - (cot.monto_pagado || 0);

    // VALIDACIÓN: No permitir pago mayor a la deuda
    if (usdEquivalente > deudaActual + 0.01) {
      alert(
        `⚠️ El monto ($${usdEquivalente.toFixed(2)}) supera la deuda actual ($${deudaActual.toFixed(2)})`,
      );
      return;
    }

    setProcesandoAccion(true);
    try {
      const { error: errorPago } = await supabase
        .from('pagos_registrados')
        .insert([
          {
            cotizacion_id: cot.id,
            monto_bs: montoBsRecibido,
            monto_usd: montoUsdRecibido,
            tasa_aplicada: tasaDia || cot.tasa_bcv,
            observacion: observacion || tipo,
          },
        ]);

      if (errorPago) throw errorPago;

      const nuevoTotalPagado = (cot.monto_pagado || 0) + usdEquivalente;
      await supabase
        .from('cotizaciones')
        .update({
          monto_pagado: nuevoTotalPagado,
          estado_pago:
            nuevoTotalPagado >= cot.total - 0.01 ? 'pagado' : 'parcial',
        })
        .eq('id', cot.id);

      setMostrarAbonar(false);
      setMontoBsRecibido(0);
      setMontoUsdRecibido(0);
      setCotizacionSeleccionada(null);
      cargarDatos();
    } catch (error) {
      alert('Error al registrar pago');
    }
    setProcesandoAccion(false);
  };

  const historialFiltrado = cotizaciones.filter((cot) => {
    const term = busqueda.toLowerCase();
    const coincideNombre = cot.clientes?.nombre?.toLowerCase().includes(term);
    const fechaCot = cot.created_at.split('T')[0];
    return coincideNombre && (filtroFecha === '' || fechaCot === filtroFecha);
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* CAJAS DE CIERRE */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-lg">
            <p className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1">
              <Clock size={12} /> Caja Bs (Hoy)
            </p>
            <h3 className="text-3xl font-black text-white">
              Bs. {cajasHoy.bs.toLocaleString('es-VE')}
            </h3>
          </div>
          <div className="bg-orange-600 p-6 rounded-[2rem] text-white shadow-lg">
            <p className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1">
              <Clock size={12} /> Caja USD (Hoy)
            </p>
            <h3 className="text-3xl font-black text-white">
              ${cajasHoy.usd.toLocaleString()}
            </h3>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-orange-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase">
              Cuentas por Cobrar (Solo Aprobadas)
            </p>
            <h3 className="text-3xl font-black text-red-600">
              {/* DETALLE: Solo sumamos deuda de las que están aprobadas */}$
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

        {/* BUSCADOR */}
        <input
          type="text"
          placeholder="Buscar cliente..."
          className="w-full p-4 mb-6 rounded-2xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-orange-500 font-bold"
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div className="space-y-3">
          {historialFiltrado.map((cot) => {
            const deudaUsd = cot.total - (cot.monto_pagado || 0);
            const estaPagado = deudaUsd <= 0.05;
            const esAprobada = cot.estado === 'aprobado';

            return (
              <div
                key={cot.id}
                className="bg-white p-5 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between shadow-sm gap-4 transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className={`p-4 rounded-2xl ${estaPagado ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {estaPagado ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Clock size={20} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-xs">
                      {cot.clientes?.nombre}
                    </h4>
                    <div className="flex gap-2 mt-1">
                      <span
                        className={`text-[8px] font-black px-2 py-0.5 rounded ${esAprobada ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}
                      >
                        {cot.estado?.toUpperCase()}
                      </span>
                      {estaPagado && (
                        <span className="text-[8px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-600">
                          SOLVENTE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Total
                    </p>
                    <p className="font-black text-slate-800 text-sm">
                      ${cot.total.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right border-l pl-6">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic">
                      Deuda
                    </p>
                    {/* DETALLE: Si no está aprobada, no mostramos deuda (mostramos --) */}
                    <p
                      className={`font-black text-sm ${!esAprobada ? 'text-slate-300' : estaPagado ? 'text-emerald-500' : 'text-red-600'}`}
                    >
                      {!esAprobada
                        ? 'PENDIENTE'
                        : estaPagado
                          ? '$0.00'
                          : `$${deudaUsd.toFixed(2)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setCotizacionSeleccionada(cot)}
                    className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-orange-600 transition-colors"
                  >
                    <Eye size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL DE GESTIÓN */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-black uppercase text-slate-800 tracking-tighter">
                  Detalles de Operación
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

              <div className="p-6 space-y-6">
                {cotizacionSeleccionada.estado === 'pendiente' ? (
                  <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200 text-center">
                    <AlertCircle className="mx-auto mb-2 text-amber-500" />
                    <p className="text-xs font-bold text-amber-800 mb-4 uppercase">
                      Debe aprobar para activar cobros e inventario
                    </p>
                    <button
                      onClick={() => aprobarOperacion(cotizacionSeleccionada)}
                      disabled={procesandoAccion}
                      className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"
                    >
                      {procesandoAccion ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        'Aprobar Ahora'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-[9px] font-black text-emerald-400 uppercase">
                          Abonado
                        </p>
                        <p className="text-lg font-black text-emerald-700">
                          $
                          {(cotizacionSeleccionada.monto_pagado || 0).toFixed(
                            2,
                          )}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase">
                          Resta por Pagar
                        </p>
                        <p className="text-lg font-black text-red-600">
                          $
                          {(
                            cotizacionSeleccionada.total -
                            (cotizacionSeleccionada.monto_pagado || 0)
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* LÓGICA: Solo mostrar botón de abono si tiene deuda */}
                    {cotizacionSeleccionada.total -
                      (cotizacionSeleccionada.monto_pagado || 0) >
                    0.05 ? (
                      <>
                        <button
                          onClick={() => setMostrarAbonar(!mostrarAbonar)}
                          className="w-full bg-slate-100 text-slate-600 p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"
                        >
                          {mostrarAbonar
                            ? 'Cancelar Registro'
                            : 'Registrar Abono'}
                        </button>

                        {mostrarAbonar && (
                          <div className="space-y-4 p-5 bg-slate-50 rounded-[2rem] border border-slate-200">
                            <input
                              type="number"
                              placeholder="Tasa BCV del día"
                              className="w-full p-3 rounded-xl border-none ring-1 ring-slate-200 font-black"
                              onChange={(e) =>
                                setTasaDia(parseFloat(e.target.value) || 0)
                              }
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                placeholder="Bs"
                                className="p-3 rounded-xl border-none ring-1 ring-slate-200 font-black"
                                onChange={(e) =>
                                  setMontoBsRecibido(
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                              <input
                                type="number"
                                placeholder="USD $"
                                className="p-3 rounded-xl border-none ring-1 ring-slate-200 font-black"
                                onChange={(e) =>
                                  setMontoUsdRecibido(
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <button
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
                                className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-black uppercase text-xs"
                              >
                                Confirmar Monto Recibido: $
                                {(
                                  montoUsdRecibido +
                                  montoBsRecibido /
                                    (tasaDia || cotizacionSeleccionada.tasa_bcv)
                                ).toFixed(2)}
                              </button>

                              {/* BOTÓN PAGO COMPLETO */}
                              <button
                                onClick={() => {
                                  const deuda =
                                    cotizacionSeleccionada.total -
                                    (cotizacionSeleccionada.monto_pagado || 0);
                                  setMontoUsdRecibido(deuda);
                                  setMontoBsRecibido(0);
                                  registrarPago(
                                    cotizacionSeleccionada,
                                    deuda,
                                    'Pago Total',
                                  );
                                }}
                                className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2"
                              >
                                <Check size={14} /> Registrar Pago Total ($$
                                {(
                                  cotizacionSeleccionada.total -
                                  (cotizacionSeleccionada.monto_pagado || 0)
                                ).toFixed(2)}
                                )
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-200 text-center">
                        <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                          <Check size={24} />
                        </div>
                        <h4 className="font-black text-emerald-800 uppercase text-sm">
                          Cliente Solvente
                        </h4>
                        <p className="text-[10px] text-emerald-600 font-bold">
                          Esta cuenta no posee deudas pendientes.
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
