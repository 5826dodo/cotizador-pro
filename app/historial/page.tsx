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
  TrendingUp,
  Clock,
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);

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

  // --- LÓGICA DE TIEMPO ---
  const hoy = new Date().toISOString().split('T')[0];
  const mesActual = new Date().getMonth();

  const ventasValidas = cotizaciones.filter(
    (c) => c.estado === 'aprobado' || c.tipo_operacion === 'venta_directa',
  );

  // --- CAJAS DEL DÍA (Solo lo cobrado HOY) ---
  const cajaBsDia = ventasValidas
    .filter((c) => c.created_at.startsWith(hoy) && c.moneda === 'BS')
    .reduce(
      (acc, curr) => acc + (curr.monto_pagado || 0) * (curr.tasa_bcv || 1),
      0,
    );

  const cajaUsdDia = ventasValidas
    .filter((c) => c.created_at.startsWith(hoy) && c.moneda !== 'BS')
    .reduce((acc, curr) => acc + (curr.monto_pagado || 0), 0);

  // --- RESUMEN DEL MES (Totales) ---
  const vendidoMesBs = ventasValidas
    .filter(
      (c) =>
        new Date(c.created_at).getMonth() === mesActual && c.moneda === 'BS',
    )
    .reduce((acc, curr) => acc + curr.total * (curr.tasa_bcv || 1), 0);

  const vendidoMesUsd = ventasValidas
    .filter(
      (c) =>
        new Date(c.created_at).getMonth() === mesActual && c.moneda !== 'BS',
    )
    .reduce((acc, curr) => acc + curr.total, 0);

  // --- CUENTAS POR COBRAR ---
  const totalPorCobrar = ventasValidas.reduce(
    (acc, curr) => acc + (curr.total - (curr.monto_pagado || 0)),
    0,
  );

  // --- ACTUALIZAR PAGO ---
  const actualizarPago = async (id: string, nuevoMontoPagado: number) => {
    setProcesandoAccion(true);
    const { error } = await supabase
      .from('cotizaciones')
      .update({ monto_pagado: nuevoMontoPagado })
      .eq('id', id);

    if (!error) {
      alert('Pago actualizado');
      cargarHistorial();
      setCotizacionSeleccionada(null);
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
        {/* HEADER Y CAJAS DEL DÍA */}
        <section className="mb-8">
          <h1 className="text-4xl font-black text-slate-800 italic mb-6 uppercase tracking-tighter">
            Cierre de Ventas
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* CAJA BS DÍA */}
            <div className="bg-emerald-600 p-5 rounded-[2rem] text-white shadow-lg shadow-emerald-200">
              <span className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1">
                <Clock size={12} /> Cobrado Hoy (Bs)
              </span>
              <h3 className="text-2xl font-black">
                Bs. {cajaBsDia.toLocaleString('es-VE')}
              </h3>
            </div>
            {/* CAJA USD DÍA */}
            <div className="bg-blue-600 p-5 rounded-[2rem] text-white shadow-lg shadow-blue-200">
              <span className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1">
                <Clock size={12} /> Cobrado Hoy ($)
              </span>
              <h3 className="text-2xl font-black">
                ${cajaUsdDia.toLocaleString()}
              </h3>
            </div>
            {/* VENDIDO MES (HÍBRIDO) */}
            <div className="bg-white border border-slate-200 p-5 rounded-[2rem]">
              <span className="text-[10px] font-black text-slate-400 uppercase">
                Vendido en el Mes
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-black text-emerald-600">
                  Bs. {vendidoMesBs.toLocaleString('es-VE')}
                </span>
                <span className="text-sm font-black text-blue-600">
                  ${vendidoMesUsd.toLocaleString()}
                </span>
              </div>
            </div>
            {/* DEUDA TOTAL */}
            <div className="bg-red-50 border border-red-100 p-5 rounded-[2rem]">
              <span className="text-[10px] font-black text-red-400 uppercase">
                Cuentas por Cobrar
              </span>
              <h3 className="text-2xl font-black text-red-600">
                ${totalPorCobrar.toLocaleString()}
              </h3>
            </div>
          </div>
        </section>

        {/* LISTADO */}
        <div className="space-y-3">
          {historialFiltrado.map((cot) => {
            const esBS = cot.moneda === 'BS';
            const tasa = cot.tasa_bcv || 1;
            const totalRef = esBS ? cot.total * tasa : cot.total;
            const pagadoRef = (cot.monto_pagado || 0) * (esBS ? tasa : 1);
            const resta = totalRef - pagadoRef;

            const estaPagado = resta <= 0.01;
            const tieneAbono = (cot.monto_pagado || 0) > 0 && !estaPagado;

            return (
              <div
                key={cot.id}
                className="bg-white p-4 rounded-3xl border border-slate-100 flex flex-col md:flex-row items-center gap-4 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`p-3 rounded-2xl ${esBS ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}
                  >
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-sm">
                      {cot.clientes?.nombre}
                    </h4>
                    <div className="flex gap-1 mt-1">
                      <span
                        className={`text-[8px] font-black px-2 py-0.5 rounded ${cot.tipo_operacion === 'venta_directa' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}
                      >
                        {cot.tipo_operacion === 'venta_directa'
                          ? 'VENTA'
                          : 'COTIZACIÓN'}
                      </span>
                      {cot.estado === 'aprobado' && (
                        <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded italic">
                          APROBADA
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* SEMÁFORO DE PAGO */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {estaPagado ? (
                      <span className="text-emerald-500 font-black text-[10px] bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} /> PAGADO TOTAL
                      </span>
                    ) : tieneAbono ? (
                      <div className="flex flex-col items-end">
                        <span className="text-amber-500 font-black text-[10px] bg-amber-50 px-3 py-1 rounded-full uppercase">
                          Abonado: {esBS ? 'Bs.' : '$'}{' '}
                          {pagadoRef.toLocaleString('es-VE')}
                        </span>
                        <span className="text-[10px] font-bold text-red-500 mt-1">
                          Resta: {esBS ? 'Bs.' : '$'}{' '}
                          {resta.toLocaleString('es-VE')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-red-500 font-black text-[10px] bg-red-50 px-3 py-1 rounded-full uppercase">
                        Pendiente de Pago
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50 p-2 px-4 rounded-2xl text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Total
                    </p>
                    <p
                      className={`text-sm font-black ${esBS ? 'text-emerald-600' : 'text-blue-600'}`}
                    >
                      {esBS ? 'Bs.' : '$'} {totalRef.toLocaleString('es-VE')}
                    </p>
                  </div>

                  <button
                    onClick={() => setCotizacionSeleccionada(cot)}
                    className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-black"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL DE GESTIÓN DE PAGO */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                <h3 className="font-black uppercase text-slate-700">
                  Gestionar Pago
                </h3>
                <button onClick={() => setCotizacionSeleccionada(null)}>
                  <X />
                </button>
              </div>
              <div className="p-8">
                <div className="mb-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase">
                    Monto Total de la Operación
                  </label>
                  <p className="text-3xl font-black text-slate-800">
                    {cotizacionSeleccionada.moneda === 'BS' ? 'Bs.' : '$'}
                    {(cotizacionSeleccionada.moneda === 'BS'
                      ? cotizacionSeleccionada.total *
                        cotizacionSeleccionada.tasa_bcv
                      : cotizacionSeleccionada.total
                    ).toLocaleString('es-VE')}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">
                      Monto Cobrado (en Dólares Ref.)
                    </label>
                    <input
                      type="number"
                      defaultValue={cotizacionSeleccionada.monto_pagado || 0}
                      className="w-full p-4 bg-slate-100 rounded-2xl font-black text-xl outline-none focus:ring-2 focus:ring-blue-500"
                      id="input_pago"
                    />
                    <p className="text-[10px] text-slate-400 mt-2 italic">
                      * Registre el pago siempre en base a dólares para mantener
                      la consistencia.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => {
                        const val = (
                          document.getElementById(
                            'input_pago',
                          ) as HTMLInputElement
                        ).value;
                        actualizarPago(
                          cotizacionSeleccionada.id,
                          parseFloat(val),
                        );
                      }}
                      disabled={procesandoAccion}
                      className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      {procesandoAccion ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={20} />
                      )}
                      Guardar Pago
                    </button>
                    <button
                      onClick={() =>
                        actualizarPago(
                          cotizacionSeleccionada.id,
                          cotizacionSeleccionada.total,
                        )
                      }
                      className="bg-emerald-500 text-white p-4 rounded-2xl font-black uppercase hover:bg-emerald-600 transition-all"
                    >
                      Pagar Todo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
