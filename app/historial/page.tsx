'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { enviarNotificacionTelegram } from '../../lib/telegram';
import {
  FileText,
  X,
  Eye,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  Wallet,
  Clock,
  RefreshCcw,
  ArrowRight,
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);

  // Estado para la calculadora de abono
  const [tasaDia, setTasaDia] = useState<number>(0);
  const [montoBsRecibido, setMontoBsRecibido] = useState<number>(0);

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

  // --- LÓGICA DE CAJAS DEL DÍA ---
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

  // --- ACCIÓN: REGISTRAR ABONO ---
  const registrarAbono = async (cot: any, usdAmortizados: number) => {
    setProcesandoAccion(true);
    const nuevoTotalPagado = (cot.monto_pagado || 0) + usdAmortizados;

    const { error } = await supabase
      .from('cotizaciones')
      .update({ monto_pagado: nuevoTotalPagado })
      .eq('id', cot.id);

    if (!error) {
      const mensaje = `💰 *ABONO RECIBIDO*\n👤 *Cliente:* ${cot.clientes?.nombre}\n💵 *Equivale a:* $${usdAmortizados.toFixed(2)}\n📈 *Tasa Aplicada:* ${tasaDia} Bs\n📉 *Nueva Deuda:* $${(cot.total - nuevoTotalPagado).toFixed(2)}`;
      await enviarNotificacionTelegram(mensaje);
      alert('Abono registrado con éxito');
      setCotizacionSeleccionada(null);
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
      alert('Cotización aprobada. Ya puedes registrar pagos.');
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
              Por Cobrar Total
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
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Buscar cliente..."
            className="flex-1 p-4 rounded-2xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* LISTADO DE OPERACIONES */}
        <div className="space-y-3">
          {historialFiltrado.map((cot) => {
            const esBS = cot.moneda === 'BS';
            const montoMostrar = esBS ? cot.total * cot.tasa_bcv : cot.total;
            const deudaUsd = cot.total - (cot.monto_pagado || 0);
            const estaPagado = deudaUsd <= 0.01;

            return (
              <div
                key={cot.id}
                className="bg-white p-5 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between shadow-sm gap-4"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className={`p-4 rounded-2xl ${cot.estado === 'pendiente' ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600'}`}
                  >
                    {esBS ? <Wallet size={20} /> : <DollarSign size={20} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-sm">
                      {cot.clientes?.nombre}
                    </h4>
                    <div className="flex gap-2 mt-1">
                      <span
                        className={`text-[8px] font-black px-2 py-0.5 rounded ${cot.tipo_operacion === 'venta_directa' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}
                      >
                        {cot.tipo_operacion === 'venta_directa'
                          ? 'VENTA'
                          : 'COTIZACIÓN'}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400">
                        Tasa: {cot.tasa_bcv} Bs
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Monto en {cot.moneda}
                    </p>
                    <p className="font-black text-slate-800 text-lg">
                      {esBS ? 'Bs.' : '$'}{' '}
                      {montoMostrar.toLocaleString('es-VE')}
                    </p>
                  </div>

                  <div className="text-right border-l pl-6">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Estado Pago
                    </p>
                    <p
                      className={`font-black text-sm ${estaPagado ? 'text-emerald-500' : 'text-red-500'}`}
                    >
                      {estaPagado ? 'PAGADO' : `DEBE $${deudaUsd.toFixed(2)}`}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setCotizacionSeleccionada(cot);
                      setTasaDia(0);
                      setMontoBsRecibido(0);
                    }}
                    className="p-4 bg-slate-900 text-white rounded-2xl hover:scale-105 transition-all"
                  >
                    <Eye size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL INTEGRADO */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                <div>
                  <h3 className="font-black uppercase text-slate-700">
                    Detalle de Operación
                  </h3>
                  <span className="text-[10px] bg-slate-200 px-2 py-1 rounded font-bold uppercase">
                    {cotizacionSeleccionada.estado}
                  </span>
                </div>
                <button onClick={() => setCotizacionSeleccionada(null)}>
                  <X />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* Visualización de Deuda Original vs Actual */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Tasa de Venta Original
                    </p>
                    <p className="text-xl font-black">
                      {cotizacionSeleccionada.tasa_bcv} Bs
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase">
                      Resta en $ (Ancla)
                    </p>
                    <p className="text-xl font-black text-blue-700">
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
                    <p className="font-bold text-amber-800 mb-4 text-sm">
                      Esta cotización aún no ha sido aprobada para la venta.
                    </p>
                    <button
                      onClick={() => aprobarCotizacion(cotizacionSeleccionada)}
                      className="bg-amber-500 text-white px-8 py-3 rounded-xl font-black uppercase text-xs hover:bg-amber-600"
                    >
                      Aprobar y habilitar pagos
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                      <RefreshCcw size={14} /> Revalorización de Cobro (Tasa del
                      Día)
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 ml-1">
                          Tasa Hoy
                        </label>
                        <input
                          type="number"
                          placeholder="Ej: 54.2"
                          className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-black"
                          onChange={(e) =>
                            setTasaDia(parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-emerald-600 ml-1">
                          Monto en Bs Recibido
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-full p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 font-black text-emerald-700"
                          onChange={(e) =>
                            setMontoBsRecibido(parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>

                    {tasaDia > 0 && montoBsRecibido > 0 && (
                      <div className="p-4 bg-slate-900 rounded-2xl text-white flex items-center justify-between">
                        <div>
                          <p className="text-[9px] uppercase font-bold opacity-60">
                            Amortiza a la deuda:
                          </p>
                          <p className="text-2xl font-black text-emerald-400">
                            ${(montoBsRecibido / tasaDia).toFixed(2)}
                          </p>
                        </div>
                        <ArrowRight className="text-slate-500" />
                        <div className="text-right">
                          <p className="text-[9px] uppercase font-bold opacity-60">
                            Nueva Deuda:
                          </p>
                          <p className="text-lg font-black text-red-400">
                            $
                            {(
                              cotizacionSeleccionada.total -
                              (cotizacionSeleccionada.monto_pagado || 0) -
                              montoBsRecibido / tasaDia
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() =>
                        registrarAbono(
                          cotizacionSeleccionada,
                          montoBsRecibido / tasaDia,
                        )
                      }
                      disabled={
                        !tasaDia || !montoBsRecibido || procesandoAccion
                      }
                      className="w-full bg-blue-600 text-white p-5 rounded-[2rem] font-black uppercase hover:bg-blue-700 disabled:opacity-30 transition-all"
                    >
                      {procesandoAccion ? (
                        <Loader2 className="animate-spin mx-auto" />
                      ) : (
                        'Confirmar Abono y Actualizar Caja'
                      )}
                    </button>
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
