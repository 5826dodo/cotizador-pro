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
                  className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-all"
                >
                  {/* Info Cliente */}
                  <div className="flex items-center gap-4 flex-1 w-full">
                    <div
                      className={`p-4 rounded-2xl ${estaPagado ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100'}`}
                    >
                      {esBS ? <Wallet size={24} /> : <DollarSign size={24} />}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 uppercase text-sm leading-none">
                        {cot.clientes?.nombre}
                      </h4>
                      <div className="flex gap-2 mt-2 items-center">
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                          <Calendar size={10} />{' '}
                          {formatearFecha(cot.created_at)}
                        </span>
                        <span
                          className={`text-[8px] font-black px-2 py-0.5 rounded ${esBS ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}
                        >
                          ORIGEN: {cot.moneda}
                        </span>
                      </div>
                      {esBS && (
                        <p className="text-[9px] font-black text-emerald-500 mt-1 flex items-center gap-1">
                          <TrendingUp size={10} /> Tasa: {tasa}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Montos Dinámicos */}
                  <div className="grid grid-cols-2 md:flex md:items-center gap-8 w-full md:w-auto">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Monto Venta
                      </p>
                      {esBS ? (
                        <>
                          <p className="font-black text-emerald-600 text-lg leading-none">
                            Bs. {(cot.total * tasa).toLocaleString('es-VE')}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">
                            $ {cot.total.toFixed(2)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-black text-slate-800 text-lg leading-none">
                            $ {cot.total.toFixed(2)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 italic">
                            Bs. {(cot.total * tasa).toLocaleString('es-VE')}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="text-right border-l-2 border-slate-50 pl-6">
                      <p className="text-[9px] font-black text-slate-400 uppercase italic">
                        Deuda Actual
                      </p>
                      {estaPagado ? (
                        <p className="font-black text-emerald-500 text-sm">
                          SOLVENTE
                        </p>
                      ) : !esAprobada ? (
                        <p className="font-black text-amber-500 text-xs uppercase">
                          PENDIENTE
                        </p>
                      ) : (
                        <>
                          <p
                            className={`font-black text-lg leading-none ${esBS ? 'text-emerald-600' : 'text-red-600'}`}
                          >
                            {esBS
                              ? `Bs. ${(deudaUsd * tasa).toLocaleString('es-VE')}`
                              : `$${deudaUsd.toFixed(2)}`}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">
                            {esBS
                              ? `$ ${deudaUsd.toFixed(2)}`
                              : `Bs. ${(deudaUsd * tasa).toLocaleString('es-VE')}`}
                          </p>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => setCotizacionSeleccionada(cot)}
                      className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-emerald-600 transition-all flex justify-center"
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
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="font-black uppercase text-xl">
                    Detalle de Gestión
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Origen: {cotizacionSeleccionada.moneda} | Tasa:{' '}
                    {cotizacionSeleccionada.tasa_bcv}
                  </p>
                </div>
                <button
                  onClick={() => setCotizacionSeleccionada(null)}
                  className="p-3 bg-white rounded-full shadow-sm hover:text-red-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* Caso 1: Sin Aprobar */}
                {cotizacionSeleccionada.estado === 'pendiente' ? (
                  <div className="p-8 bg-amber-50 rounded-[2rem] border-2 border-dashed border-amber-200 text-center">
                    <AlertCircle
                      className="mx-auto mb-3 text-amber-500"
                      size={32}
                    />
                    <p className="text-sm font-black text-amber-800 uppercase mb-4">
                      Aprobar para habilitar cobros e inventario
                    </p>
                    <button
                      onClick={() => aprobarOperacion(cotizacionSeleccionada)}
                      className="w-full bg-amber-500 text-white p-5 rounded-2xl font-black uppercase text-xs shadow-lg shadow-amber-200"
                    >
                      Aprobar Ahora
                    </button>
                  </div>
                ) : (
                  /* Caso 2: Aprobada (Cobros) */
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-400 uppercase">
                          Abonado ({cotizacionSeleccionada.moneda})
                        </p>
                        <p className="text-xl font-black text-emerald-700">
                          {cotizacionSeleccionada.moneda === 'BS'
                            ? `Bs. ${(cotizacionSeleccionada.monto_pagado * cotizacionSeleccionada.tasa_bcv).toLocaleString('es-VE')}`
                            : `$${(cotizacionSeleccionada.monto_pagado || 0).toFixed(2)}`}
                        </p>
                      </div>
                      <div className="p-5 bg-red-50 rounded-3xl border border-red-100">
                        <p className="text-[10px] font-black text-red-400 uppercase">
                          Debe ({cotizacionSeleccionada.moneda})
                        </p>
                        <p className="text-xl font-black text-red-600">
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
                          className="w-full bg-slate-100 text-slate-600 p-4 rounded-2xl font-black uppercase text-xs flex justify-center gap-2"
                        >
                          {mostrarAbonar
                            ? 'Cerrar Registro'
                            : 'Registrar Nuevo Pago'}{' '}
                          <ChevronDown
                            size={16}
                            className={mostrarAbonar ? 'rotate-180' : ''}
                          />
                        </button>

                        {mostrarAbonar && (
                          <div className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 space-y-4">
                            <div>
                              <label className="text-[10px] font-black uppercase ml-2 text-slate-400 italic">
                                Tasa de este pago
                              </label>
                              <input
                                type="number"
                                className="w-full p-4 rounded-2xl border-none ring-2 ring-slate-200 font-black"
                                placeholder="Tasa actual"
                                onChange={(e) =>
                                  setTasaDia(parseFloat(e.target.value) || 0)
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="number"
                                className="p-4 rounded-2xl ring-2 ring-emerald-100 border-none font-black text-emerald-600"
                                placeholder="Monto Bs"
                                onChange={(e) =>
                                  setMontoBsRecibido(
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                              <input
                                type="number"
                                className="p-4 rounded-2xl ring-2 ring-blue-100 border-none font-black text-blue-600"
                                placeholder="Monto $"
                                onChange={(e) =>
                                  setMontoUsdRecibido(
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>

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
                              className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase text-xs shadow-lg"
                            >
                              Confirmar Abono (${' '}
                              {(
                                montoUsdRecibido +
                                montoBsRecibido /
                                  (tasaDia || cotizacionSeleccionada.tasa_bcv)
                              ).toFixed(2)}
                              )
                            </button>

                            <button
                              onClick={() => {
                                const saldoUsd =
                                  cotizacionSeleccionada.total -
                                  (cotizacionSeleccionada.monto_pagado || 0);
                                setMontoUsdRecibido(saldoUsd);
                                setMontoBsRecibido(0);
                                registrarPago(
                                  cotizacionSeleccionada,
                                  saldoUsd,
                                  'Pago Total',
                                );
                              }}
                              className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2"
                            >
                              <Check size={14} /> Liquidar Deuda Total
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 bg-emerald-50 rounded-[2.5rem] text-center border-2 border-emerald-100">
                        <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                          <Check size={32} />
                        </div>
                        <h3 className="text-xl font-black text-emerald-900 uppercase">
                          SOLVENTE
                        </h3>
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
