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

  const formatearFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const registrarPago = async (
    cot: any,
    usdEquivalente: number,
    tipo: string,
  ) => {
    const deudaActual = cot.total - (cot.monto_pagado || 0);
    if (usdEquivalente > deudaActual + 0.05) {
      alert(
        `⚠️ El monto ($${usdEquivalente.toFixed(2)}) supera la deuda ($${deudaActual.toFixed(2)})`,
      );
      return;
    }

    setProcesandoAccion(true);
    try {
      await supabase.from('pagos_registrados').insert([
        {
          cotizacion_id: cot.id,
          monto_bs: montoBsRecibido,
          monto_usd: montoUsdRecibido,
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

      alert('✅ Pago registrado con éxito');
      setCotizacionSeleccionada(null);
      cargarDatos();
    } catch (error) {
      alert('Error al procesar pago');
    }
    setProcesandoAccion(false);
  };

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

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        {/* CABECERA Y CAJAS */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">
              Historial de Ventas
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase">
              Cierre de caja y control de deudas
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase">
              Fecha de Hoy
            </p>
            <p className="text-sm font-black">
              {formatearFecha(new Date().toISOString())}
            </p>
          </div>
        </div>

        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-xl shadow-emerald-100">
            <p className="text-[10px] font-black uppercase opacity-70">
              Caja Bs Hoy
            </p>
            <h3 className="text-3xl font-black">
              Bs. {cajasHoy.bs.toLocaleString('es-VE')}
            </h3>
          </div>
          <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200">
            <p className="text-[10px] font-black uppercase opacity-70">
              Caja USD Hoy
            </p>
            <h3 className="text-3xl font-black">
              ${cajasHoy.usd.toLocaleString()}
            </h3>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border-2 border-orange-100">
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

        {/* BUSCADOR */}
        <input
          type="text"
          placeholder="Buscar por cliente o empresa..."
          className="w-full p-4 mb-8 rounded-2xl border-none ring-2 ring-slate-100 focus:ring-orange-500 font-bold outline-none transition-all shadow-sm"
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {/* LISTADO */}
        <div className="space-y-4">
          {cotizaciones
            .filter((c) =>
              c.clientes?.nombre
                ?.toLowerCase()
                .includes(busqueda.toLowerCase()),
            )
            .map((cot) => {
              const esUSD = cot.moneda === 'USD';
              const deudaUsd = cot.total - (cot.monto_pagado || 0);
              const estaPagado = deudaUsd <= 0.05;

              return (
                <div
                  key={cot.id}
                  className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4 flex-1 w-full">
                    <div
                      className={`p-4 rounded-2xl ${estaPagado ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}
                    >
                      {esUSD ? <DollarSign size={24} /> : <Wallet size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-800 uppercase text-sm leading-none">
                          {cot.clientes?.nombre}
                        </h4>
                        <span
                          className={`text-[8px] font-black px-2 py-0.5 rounded ${esUSD ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}
                        >
                          {esUSD ? 'USD' : 'BS'}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2 items-center">
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                          <Calendar size={10} />{' '}
                          {formatearFecha(cot.created_at)}
                        </span>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${cot.tipo_operacion === 'venta_directa' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {cot.tipo_operacion?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:flex md:items-center gap-8 w-full md:w-auto">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Total Venta
                      </p>
                      <p className="font-black text-slate-800 text-sm">
                        ${cot.total.toFixed(2)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 italic">
                        Bs.{' '}
                        {(cot.total * (cot.tasa_bcv || 1)).toLocaleString(
                          'es-VE',
                        )}
                      </p>
                    </div>
                    <div className="text-right border-l-2 border-slate-50 pl-6">
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Deuda Pendiente
                      </p>
                      <p
                        className={`font-black text-sm ${estaPagado ? 'text-emerald-500' : 'text-red-600'}`}
                      >
                        {estaPagado ? 'SOLVENTE' : `$${deudaUsd.toFixed(2)}`}
                      </p>
                      {!estaPagado && (
                        <p className="text-[10px] font-bold text-red-300">
                          Bs.{' '}
                          {(deudaUsd * (cot.tasa_bcv || 1)).toLocaleString(
                            'es-VE',
                          )}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setCotizacionSeleccionada(cot)}
                      className="col-span-2 md:col-span-1 p-4 bg-slate-900 text-white rounded-[1.5rem] hover:bg-orange-600 transition-all flex justify-center"
                    >
                      <Eye size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* MODAL GESTIÓN */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[3rem] max-h-[90vh] overflow-y-auto shadow-2xl border-4 border-white">
              <div className="p-8 border-b flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-sm z-10">
                <div>
                  <h3 className="font-black uppercase text-xl tracking-tighter">
                    Gestión de Pago
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {cotizacionSeleccionada.clientes?.nombre} |{' '}
                    {formatearFecha(cotizacionSeleccionada.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCotizacionSeleccionada(null);
                    setMostrarAbonar(false);
                  }}
                  className="p-3 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {cotizacionSeleccionada.estado === 'pendiente' ? (
                  <div className="p-8 bg-amber-50 rounded-[2rem] border-2 border-dashed border-amber-200 text-center">
                    <AlertCircle
                      className="mx-auto mb-3 text-amber-500"
                      size={32}
                    />
                    <p className="text-sm font-black text-amber-800 uppercase mb-4 leading-tight">
                      Esta operación está en espera.
                      <br />
                      Debe aprobar para descontar stock.
                    </p>
                    <button
                      onClick={() => aprobarOperacion(cotizacionSeleccionada)}
                      className="w-full bg-amber-500 text-white p-5 rounded-2xl font-black uppercase text-xs shadow-lg shadow-amber-200 transition-transform active:scale-95"
                    >
                      Aprobar y Confirmar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-400 uppercase">
                          Monto Pagado
                        </p>
                        <p className="text-xl font-black text-emerald-700">
                          $
                          {(cotizacionSeleccionada.monto_pagado || 0).toFixed(
                            2,
                          )}
                        </p>
                      </div>
                      <div className="p-5 bg-red-50 rounded-3xl border border-red-100">
                        <p className="text-[10px] font-black text-red-400 uppercase">
                          Resta por Pagar
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

                    {cotizacionSeleccionada.total -
                      (cotizacionSeleccionada.monto_pagado || 0) >
                    0.05 ? (
                      <div className="space-y-4">
                        <button
                          onClick={() => setMostrarAbonar(!mostrarAbonar)}
                          className="w-full bg-slate-100 text-slate-600 p-4 rounded-2xl font-black uppercase text-xs"
                        >
                          {mostrarAbonar
                            ? 'Cerrar Panel de Pago'
                            : 'Registrar Nuevo Pago / Abono'}
                        </button>

                        {mostrarAbonar && (
                          <div className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div>
                              <label className="text-[10px] font-black uppercase ml-2 text-slate-400">
                                Tasa de Cambio del Pago
                              </label>
                              <input
                                type="number"
                                className="w-full p-4 rounded-2xl border-none ring-2 ring-slate-200 font-black"
                                placeholder="Ej: 56.40"
                                onChange={(e) =>
                                  setTasaDia(parseFloat(e.target.value) || 0)
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-black uppercase ml-2 text-emerald-500">
                                  Monto en Bs
                                </label>
                                <input
                                  type="number"
                                  className="w-full p-4 rounded-2xl border-none ring-2 ring-emerald-100 font-black text-emerald-600"
                                  onChange={(e) =>
                                    setMontoBsRecibido(
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase ml-2 text-orange-500">
                                  Monto en $
                                </label>
                                <input
                                  type="number"
                                  className="w-full p-4 rounded-2xl border-none ring-2 ring-orange-100 font-black text-orange-600"
                                  onChange={(e) =>
                                    setMontoUsdRecibido(
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                            </div>

                            <div className="p-4 bg-slate-900 rounded-2xl text-white flex justify-between items-center">
                              <span className="text-[10px] font-bold uppercase opacity-60">
                                Total a descontar:
                              </span>
                              <span className="text-xl font-black text-emerald-400">
                                $
                                {(
                                  montoUsdRecibido +
                                  montoBsRecibido /
                                    (tasaDia || cotizacionSeleccionada.tasa_bcv)
                                ).toFixed(2)}
                              </span>
                            </div>

                            <button
                              onClick={() =>
                                registrarPago(
                                  cotizacionSeleccionada,
                                  montoUsdRecibido +
                                    montoBsRecibido /
                                      (tasaDia ||
                                        cotizacionSeleccionada.tasa_bcv),
                                  'Abono',
                                )
                              }
                              className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-200"
                            >
                              Confirmar Pago
                            </button>

                            <button
                              onClick={() => {
                                const saldo =
                                  cotizacionSeleccionada.total -
                                  (cotizacionSeleccionada.monto_pagado || 0);
                                setMontoUsdRecibido(saldo);
                                setMontoBsRecibido(0);
                                registrarPago(
                                  cotizacionSeleccionada,
                                  saldo,
                                  'Saldado Completo',
                                );
                              }}
                              className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 tracking-widest"
                            >
                              <Check size={14} /> Liquidar Deuda Total
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-10 bg-emerald-50 rounded-[2.5rem] text-center border-2 border-emerald-100">
                        <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
                          <Check size={32} />
                        </div>
                        <h3 className="text-xl font-black text-emerald-900 uppercase tracking-tighter">
                          Cuenta Solvente
                        </h3>
                        <p className="text-xs font-bold text-emerald-600 uppercase">
                          No existen deudas pendientes para este registro
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
