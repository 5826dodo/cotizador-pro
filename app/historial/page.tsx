'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { enviarNotificacionTelegram } from '../../lib/telegram';
import {
  FileText,
  X,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  Wallet,
  RefreshCcw,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);

  // Estados para el cobro
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
      .update({
        monto_pagado: nuevoTotalPagado,
        observaciones_pago: observacion, // Asegúrate de tener esta columna o guardarla en un log
      })
      .eq('id', cot.id);

    if (!error) {
      const mensaje = `💰 *${tipo.toUpperCase()}*\n👤 *Cliente:* ${cot.clientes?.nombre}\n💵 *Abono:* $${usdAmortizados.toFixed(2)}\n📝 *Nota:* ${observacion || 'Sin nota'}\n📉 *Saldo Restante:* $${(cot.total - nuevoTotalPagado).toFixed(2)}`;
      await enviarNotificacionTelegram(mensaje);
      alert('Pago procesado exitosamente');
      setCotizacionSeleccionada(null);
      limpiarCampos();
      cargarHistorial();
    }
    setProcesandoAccion(false);
  };

  const limpiarCampos = () => {
    setTasaDia(0);
    setMontoBsRecibido(0);
    setMontoUsdRecibido(0);
    setObservacion('');
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* RESUMEN DE CAJA */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-lg">
            <p className="text-[10px] font-black uppercase opacity-70">
              Efectivo/Transferencia Bs (Hoy)
            </p>
            <h3 className="text-3xl font-black">
              Bs. {cajaBsDia.toLocaleString('es-VE')}
            </h3>
          </div>
          <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-lg">
            <p className="text-[10px] font-black uppercase opacity-70">
              Divisas en Caja (Hoy)
            </p>
            <h3 className="text-3xl font-black">
              ${cajaUsdDia.toLocaleString()}
            </h3>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
              Cuentas por Cobrar (USD)
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

        {/* LISTADO */}
        <div className="space-y-3">
          {cotizaciones.map((cot) => {
            const esBS = cot.moneda === 'BS';
            const totalEnBs = cot.total * cot.tasa_bcv;
            const deudaUsd = cot.total - (cot.monto_pagado || 0);
            const estaPagado = deudaUsd <= 0.01;

            return (
              <div
                key={cot.id}
                className="bg-white p-5 rounded-[2rem] border border-slate-100 flex items-center justify-between hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-4 rounded-2xl ${estaPagado ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-400'}`}
                  >
                    {esBS ? <Wallet size={20} /> : <DollarSign size={20} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-xs">
                      {cot.clientes?.nombre}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold">
                      Ref Venta: {cot.tasa_bcv} Bs/$
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Monto Venta
                    </p>
                    <p className="font-black text-slate-800">
                      {esBS
                        ? `Bs. ${totalEnBs.toLocaleString('es-VE')}`
                        : `$${cot.total.toLocaleString()}`}
                    </p>
                  </div>
                  <div className="text-right border-l pl-8">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic">
                      Pendiente
                    </p>
                    <p
                      className={`font-black ${estaPagado ? 'text-emerald-500' : 'text-red-600'}`}
                    >
                      ${deudaUsd.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => setCotizacionSeleccionada(cot)}
                    className="p-3 bg-slate-900 text-white rounded-2xl"
                  >
                    <Eye size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL DE COBRO PROFESIONAL */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-2xl">
              <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black uppercase text-slate-800 leading-none">
                    Gestionar Cobro
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    {cotizacionSeleccionada.clientes?.nombre}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCotizacionSeleccionada(null);
                    limpiarCampos();
                  }}
                  className="p-3 hover:bg-slate-200 rounded-full"
                >
                  <X />
                </button>
              </div>

              <div className="p-10 space-y-8">
                {/* Banner de Deuda Original en Bs y $ */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-100 rounded-3xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                      Venta Original (Bs)
                    </p>
                    <p className="text-2xl font-black text-slate-700">
                      Bs.{' '}
                      {(
                        cotizacionSeleccionada.total *
                        cotizacionSeleccionada.tasa_bcv
                      ).toLocaleString('es-VE')}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                      Tasa Ref: {cotizacionSeleccionada.tasa_bcv}
                    </p>
                  </div>
                  <div className="p-6 bg-blue-600 rounded-3xl text-white">
                    <p className="text-[10px] font-black uppercase opacity-80 mb-1">
                      Resta por Cobrar ($)
                    </p>
                    <p className="text-3xl font-black">
                      $
                      {(
                        cotizacionSeleccionada.total -
                        (cotizacionSeleccionada.monto_pagado || 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* ACCIONES DE COBRO */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        registrarPago(
                          cotizacionSeleccionada,
                          cotizacionSeleccionada.total -
                            (cotizacionSeleccionada.monto_pagado || 0),
                          'Pago Total',
                        )
                      }
                      className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-sm hover:bg-emerald-600 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} /> Liquidar Deuda Completa
                    </button>
                  </div>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-200"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-4 font-black text-slate-400 tracking-widest">
                        O Registrar Abono
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Abono en Bs */}
                    <div className="space-y-3 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-200">
                      <p className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                        <RefreshCcw size={12} /> Abono en Bolívares
                      </p>
                      <input
                        type="number"
                        placeholder="Tasa Hoy"
                        className="w-full p-3 rounded-xl border-none ring-1 ring-slate-200 font-bold mb-2"
                        onChange={(e) =>
                          setTasaDia(parseFloat(e.target.value) || 0)
                        }
                      />
                      <input
                        type="number"
                        placeholder="Monto Bs."
                        className="w-full p-4 rounded-xl border-none ring-2 ring-emerald-500 font-black text-xl"
                        onChange={(e) =>
                          setMontoBsRecibido(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>

                    {/* Abono en USD */}
                    <div className="space-y-3 p-6 bg-blue-50 rounded-[2.5rem] border border-blue-100">
                      <p className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1">
                        <DollarSign size={12} /> Abono en Divisas
                      </p>
                      <div className="h-[48px]"></div>{' '}
                      {/* Espaciador para alinear */}
                      <input
                        type="number"
                        placeholder="Monto $"
                        className="w-full p-4 rounded-xl border-none ring-2 ring-blue-500 font-black text-xl text-blue-700"
                        onChange={(e) =>
                          setMontoUsdRecibido(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="flex items-center gap-2 p-4 bg-slate-100 rounded-2xl">
                    <MessageSquare size={18} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ej: Pago Móvil Banesco / Efectivo Divisas..."
                      className="bg-transparent border-none outline-none w-full font-bold text-sm"
                      value={observacion}
                      onChange={(e) => setObservacion(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={() => {
                      const amortizacionBs =
                        tasaDia > 0 ? montoBsRecibido / tasaDia : 0;
                      const totalAmortizado = amortizacionBs + montoUsdRecibido;
                      registrarPago(
                        cotizacionSeleccionada,
                        totalAmortizado,
                        'Abono Parcial',
                      );
                    }}
                    disabled={
                      (!montoBsRecibido && !montoUsdRecibido) ||
                      (montoBsRecibido > 0 && !tasaDia)
                    }
                    className="w-full bg-slate-900 text-white p-6 rounded-3xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-20"
                  >
                    {procesandoAccion ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      'Procesar y Actualizar'
                    )}
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
