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

  // --- LÓGICA DE CAJAS DEL DÍA (Basado en la fecha actual) ---
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

  // --- ACCIÓN: ACTUALIZAR PAGO ---
  const registrarAbono = async (cot: any, usdAmortizados: number) => {
    setProcesandoAccion(true);
    const nuevoTotalPagado = (cot.monto_pagado || 0) + usdAmortizados;

    const { error } = await supabase
      .from('cotizaciones')
      .update({ monto_pagado: nuevoTotalPagado })
      .eq('id', cot.id);

    if (!error) {
      const mensaje = `💰 *ABONO RECIBIDO*\n👤 *Cliente:* ${cot.clientes?.nombre}\n💵 *Abono:* $${usdAmortizados.toFixed(2)}\n📈 *Tasa Cobro:* ${tasaDia} Bs\n📉 *Deuda Restante:* $${(cot.total - nuevoTotalPagado).toFixed(2)}`;
      await enviarNotificacionTelegram(mensaje);

      alert('Abono registrado exitosamente');
      setCotizacionSeleccionada(null);
      cargarHistorial();
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
          <div className="bg-emerald-600 p-6 rounded-[2rem] text-white">
            <p className="text-[10px] font-black uppercase opacity-70">
              Caja Bs (Hoy)
            </p>
            <h3 className="text-3xl font-black">
              Bs. {cajaBsDia.toLocaleString('es-VE')}
            </h3>
          </div>
          <div className="bg-blue-600 p-6 rounded-[2rem] text-white">
            <p className="text-[10px] font-black uppercase opacity-70">
              Caja USD (Hoy)
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

        {/* LISTADO DE OPERACIONES */}
        <div className="space-y-3">
          {historialFiltrado.map((cot) => {
            const deudaUsd = cot.total - (cot.monto_pagado || 0);
            const estaPagado = deudaUsd <= 0.01;

            return (
              <div
                key={cot.id}
                className="bg-white p-5 rounded-[2rem] border border-slate-100 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-4 rounded-2xl ${estaPagado ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}
                  >
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-sm">
                      {cot.clientes?.nombre}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold">
                      Venta: {new Date(cot.created_at).toLocaleDateString()} |
                      Tasa Ref: {cot.tasa_bcv} Bs
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Deuda Actual
                    </p>
                    <p
                      className={`font-black ${estaPagado ? 'text-emerald-500' : 'text-red-500'}`}
                    >
                      {estaPagado ? 'PAGADO' : `$${deudaUsd.toLocaleString()}`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCotizacionSeleccionada(cot);
                      setTasaDia(0);
                      setMontoBsRecibido(0);
                    }}
                    className="p-3 bg-slate-900 text-white rounded-2xl"
                  >
                    <Eye size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL DE COBRO CON REVALORIZACIÓN */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                <h3 className="font-black uppercase text-slate-700">
                  Registrar Cobro Hoy
                </h3>
                <button onClick={() => setCotizacionSeleccionada(null)}>
                  <X />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* Info de la deuda original */}
                <div className="flex justify-between text-center gap-2">
                  <div className="flex-1 p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Tasa Venta
                    </p>
                    <p className="font-black text-slate-700">
                      {cotizacionSeleccionada.tasa_bcv} Bs
                    </p>
                  </div>
                  <div className="flex-1 p-3 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase">
                      Resta en $
                    </p>
                    <p className="font-black text-blue-700">
                      $
                      {(
                        cotizacionSeleccionada.total -
                        (cotizacionSeleccionada.monto_pagado || 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Inputs de Cobro Actual */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1">
                      <RefreshCcw size={10} /> Tasa Actual del Día
                      (BCV/Paralelo)
                    </label>
                    <input
                      type="number"
                      placeholder="Ej: 54.50"
                      className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-black text-xl outline-none focus:border-blue-500"
                      onChange={(e) =>
                        setTasaDia(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-emerald-600 uppercase ml-2">
                      Monto Recibido en Bolívares
                    </label>
                    <input
                      type="number"
                      placeholder="Monto en Bs."
                      className="w-full p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 font-black text-xl outline-none focus:border-emerald-500"
                      onChange={(e) =>
                        setMontoBsRecibido(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  {/* Cálculo en tiempo real */}
                  {tasaDia > 0 && montoBsRecibido > 0 && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 animate-pulse">
                      <p className="text-center text-sm font-bold text-amber-700">
                        Amortización de deuda:{' '}
                        <span className="text-lg font-black">
                          ${(montoBsRecibido / tasaDia).toFixed(2)}
                        </span>
                      </p>
                      <p className="text-[9px] text-center text-amber-600 uppercase font-black">
                        Calculado a tasa de hoy
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() =>
                      registrarAbono(
                        cotizacionSeleccionada,
                        montoBsRecibido / tasaDia,
                      )
                    }
                    disabled={!tasaDia || !montoBsRecibido || procesandoAccion}
                    className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black uppercase hover:bg-black disabled:opacity-30 transition-all flex items-center justify-center gap-2"
                  >
                    {procesandoAccion ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={20} />
                    )}
                    Confirmar Abono
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
