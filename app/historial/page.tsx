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
  ChevronDown, // Faltaba esta importación
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);

  // Estados para la interfaz y cobro
  const [mostrarAbonar, setMostrarAbonar] = useState(false); // Corregido: No existía
  const [tasaDia, setTasaDia] = useState<number>(0);
  const [montoBsRecibido, setMontoBsRecibido] = useState<number>(0);
  const [montoUsdRecibido, setMontoUsdRecibido] = useState<number>(0); // Corregido: No existía
  const [observacion, setObservacion] = useState(''); // Corregido: No existía

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

  // --- LÓGICA DE CAJAS ---
  const hoy = new Date().toISOString().split('T')[0];
  const ventasValidas = cotizaciones.filter(
    (c) => c.estado === 'aprobado' || c.tipo_operacion === 'venta_directa',
  );

  const cajaBsDia = ventasValidas
    .filter((c) => c.created_at.startsWith(hoy) && c.moneda === 'BS')
    .reduce(
      (acc, curr) => acc + (curr.monto_pagado || 0) * (curr.tasa_bcv || 1),
      0,
    );

  const cajaUsdDia = ventasValidas
    .filter((c) => c.created_at.startsWith(hoy) && c.moneda !== 'BS')
    .reduce((acc, curr) => acc + (curr.monto_pagado || 0), 0);

  // --- ACCIÓN: REGISTRAR PAGO (Unificado) ---
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
      const mensaje = `💰 *${tipo.toUpperCase()}*\n👤 *Cliente:* ${cot.clientes?.nombre}\n💵 *Abono:* $${usdAmortizados.toFixed(2)}\n📉 *Saldo Restante:* $${(cot.total - nuevoTotalPagado).toFixed(2)}\n📝 *Nota:* ${observacion || 'Sin nota'}`;
      await enviarNotificacionTelegram(mensaje);
      alert('Operación registrada con éxito');
      setCotizacionSeleccionada(null);
      setMostrarAbonar(false);
      setObservacion('');
      cargarHistorial();
    }
    setProcesandoAccion(false);
  };

  // --- ACCIÓN: APROBAR COTIZACIÓN ---
  const aprobarCotizacion = async (cot: any) => {
    setProcesandoAccion(true);
    const { error } = await supabase
      .from('cotizaciones')
      .update({ estado: 'aprobado' })
      .eq('id', cot.id);

    if (!error) {
      alert('Cotización aprobada.');
      cargarHistorial();
      setCotizacionSeleccionada({ ...cot, estado: 'aprobado' });
    }
    setProcesandoAccion(false);
  };

  const historialFiltrado = cotizaciones.filter((cot) => {
    const term = busqueda.toLowerCase();
    const coincideNombre = cot.clientes?.nombre?.toLowerCase().includes(term);
    const fechaCot = cot.created_at.split('T')[0];
    return coincideNombre && (filtroFecha === '' || fechaCot === filtroFecha);
  });

  if (cargando)
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* RESUMEN SUPERIOR */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-lg">
            <p className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1">
              <Clock size={12} /> Caja Bs (Hoy)
            </p>
            <h3 className="text-3xl font-black">
              Bs. {cajaBsDia.toLocaleString('es-VE')}
            </h3>
          </div>
          <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-lg">
            <p className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1">
              <Clock size={12} /> Caja USD (Hoy)
            </p>
            <h3 className="text-3xl font-black">
              ${cajaUsdDia.toLocaleString()}
            </h3>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase">
              Cuentas por Cobrar
            </p>
            <h3 className="text-3xl font-black text-red-600">
              $
              {ventasValidas
                .reduce(
                  (acc, curr) => acc + (curr.total - (curr.monto_pagado || 0)),
                  0,
                )
                .toLocaleString()}
            </h3>
          </div>
        </section>

        {/* BUSCADOR */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por cliente..."
            className="w-full p-4 rounded-2xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* LISTADO */}
        <div className="space-y-3">
          {historialFiltrado.map((cot) => {
            const esBS = cot.moneda === 'BS';
            const totalEnBs = cot.total * cot.tasa_bcv;
            const deudaUsd = cot.total - (cot.monto_pagado || 0);
            const estaPagado = deudaUsd <= 0.01;

            return (
              <div
                key={cot.id}
                className="bg-white p-5 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between shadow-sm gap-4"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className={`p-4 rounded-2xl ${estaPagado ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-400'}`}
                  >
                    {esBS ? <Wallet size={20} /> : <DollarSign size={20} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-xs">
                      {cot.clientes?.nombre}
                    </h4>
                    <span
                      className={`text-[8px] font-black px-2 py-0.5 rounded mt-1 inline-block ${cot.tipo_operacion === 'venta_directa' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}
                    >
                      {cot.tipo_operacion === 'venta_directa'
                        ? 'VENTA'
                        : 'COTIZACIÓN'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                      Venta en Bs
                    </p>
                    <p className="font-black text-slate-800 text-sm">
                      Bs. {totalEnBs.toLocaleString('es-VE')}
                    </p>
                  </div>
                  <div className="text-right border-l pl-6">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter italic">
                      Deuda actual
                    </p>
                    <p
                      className={`font-black text-sm ${estaPagado ? 'text-emerald-500' : 'text-red-600'}`}
                    >
                      {estaPagado ? 'PAGADO' : `$${deudaUsd.toFixed(2)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setCotizacionSeleccionada(cot)}
                    className="p-4 bg-slate-900 text-white rounded-2xl"
                  >
                    <Eye size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL DE COBRO (CORREGIDO Y RESPONSIVO) */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] max-h-[95vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-lg font-black uppercase text-slate-800">
                    Gestionar Cobro
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400">
                    {cotizacionSeleccionada.clientes?.nombre}
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

              <div className="p-6 space-y-6">
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
                    <p className="text-[9px] text-blue-500 font-bold tracking-widest">
                      Tasa: {cotizacionSeleccionada.tasa_bcv}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                    <p className="text-[9px] font-black text-red-400 uppercase mb-1">
                      Pendiente ($)
                    </p>
                    <p className="text-xl font-black text-red-600">
                      $
                      {(
                        cotizacionSeleccionada.total -
                        (cotizacionSeleccionada.monto_pagado || 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>

                {cotizacionSeleccionada.estado === 'pendiente' ? (
                  <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200 text-center">
                    <AlertCircle className="mx-auto mb-2 text-amber-500" />
                    <p className="text-xs font-bold text-amber-800 mb-4">
                      Aprobar cotización para cobrar.
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
                        ? 'Cerrar calculadora'
                        : 'Registrar Abono Parcial'}{' '}
                      <ChevronDown
                        size={16}
                        className={mostrarAbonar ? 'rotate-180' : ''}
                      />
                    </button>

                    {mostrarAbonar && (
                      <div className="space-y-4 p-4 bg-slate-50 rounded-3xl border border-slate-200">
                        <div className="grid grid-cols-1 gap-3">
                          <input
                            type="number"
                            placeholder="Tasa Hoy (Ej: 54.20)"
                            className="p-3 rounded-xl border-none ring-1 ring-slate-200 font-black"
                            onChange={(e) =>
                              setTasaDia(parseFloat(e.target.value) || 0)
                            }
                          />
                          <input
                            type="number"
                            placeholder="Monto en Bs."
                            className="p-3 rounded-xl border-none ring-1 ring-slate-200 font-black"
                            onChange={(e) =>
                              setMontoBsRecibido(
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                          <input
                            type="number"
                            placeholder="Monto en $ (Efectivo)"
                            className="p-3 rounded-xl border-none ring-1 ring-slate-200 font-black"
                            onChange={(e) =>
                              setMontoUsdRecibido(
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </div>

                        {(montoBsRecibido > 0 || montoUsdRecibido > 0) && (
                          <div className="p-3 bg-slate-900 rounded-xl text-white flex justify-between items-center italic">
                            <span className="text-[10px] font-bold uppercase">
                              Total Amortizado:
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

                        <input
                          type="text"
                          placeholder="Nota de pago..."
                          className="w-full p-3 rounded-xl border-none ring-1 ring-slate-200 text-xs font-bold uppercase"
                          onChange={(e) => setObservacion(e.target.value)}
                        />

                        <button
                          onClick={() =>
                            registrarPago(
                              cotizacionSeleccionada,
                              montoBsRecibido / (tasaDia || 1) +
                                montoUsdRecibido,
                              'Abono Parcial',
                            )
                          }
                          disabled={
                            (!montoBsRecibido && !montoUsdRecibido) ||
                            (montoBsRecibido > 0 && tasaDia <= 0)
                          }
                          className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-xs disabled:opacity-30"
                        >
                          Confirmar Cobro
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
