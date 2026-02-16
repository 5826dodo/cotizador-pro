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

  // --- LÓGICA DE MÉTRICAS (BASADAS EN FLUJO REAL DE DINERO) ---

  // Filtramos operaciones que ya son ventas (Aprobadas o Directas)
  const ventasEfectivas = cotizaciones.filter(
    (c) => c.estado === 'aprobado' || c.tipo_operacion === 'venta_directa',
  );

  // 1. Caja Bolívares: Suma de lo PAGADO en registros marcados como BS
  const cajaBolivaresMes = ventasEfectivas
    .filter(
      (c) =>
        new Date(c.created_at).getMonth() === new Date().getMonth() &&
        c.moneda === 'BS',
    )
    .reduce(
      (acc, curr) => acc + (curr.monto_pagado || 0) * (curr.tasa_bcv || 1),
      0,
    );

  // 2. Caja Dólares: Suma de lo PAGADO en registros marcados como USD (o distinto a BS)
  const cajaDolaresMes = ventasEfectivas
    .filter(
      (c) =>
        new Date(c.created_at).getMonth() === new Date().getMonth() &&
        c.moneda !== 'BS',
    )
    .reduce((acc, curr) => acc + (curr.monto_pagado || 0), 0);

  // 3. Cuentas por Cobrar (Deuda pendiente total en base USD para métrica general)
  const totalCuentasPorCobrar = ventasEfectivas.reduce(
    (acc, curr) => acc + (curr.total - (curr.monto_pagado || 0)),
    0,
  );

  // 4. Rendimiento vs Meta (Basado en el TOTAL de ventas del mes, no solo lo cobrado)
  const totalVendidoMes = ventasEfectivas
    .filter((c) => new Date(c.created_at).getMonth() === new Date().getMonth())
    .reduce((acc, curr) => acc + curr.total, 0);

  // --- ACCIONES ---
  const enviarReporteMensual = async () => {
    const mesNombre = new Date()
      .toLocaleString('es-ES', { month: 'long' })
      .toUpperCase();
    const mensajeReporte =
      `📊 *CIERRE DE CAJA - ${mesNombre}*\n` +
      `--------------------------\n` +
      `🇻🇪 *Cobrado en Bs:* \n*Bs. ${cajaBolivaresMes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}*\n\n` +
      `💵 *Cobrado en Dólares:* \n*$${cajaDolaresMes.toLocaleString()}*\n` +
      `--------------------------\n` +
      `🚩 *Por Cobrar:* $${totalCuentasPorCobrar.toLocaleString()}\n` +
      `📈 *Ventas Totales:* ${ventasEfectivas.length}\n` +
      `🚀 _Reporte generado automáticamente_`;

    await enviarNotificacionTelegram(mensajeReporte);
    alert('Reporte enviado a Telegram');
  };

  const aprobarCotizacion = async (cot: any) => {
    const confirmar = confirm('¿Confirmar venta y descontar stock?');
    if (!confirmar) return;
    setProcesandoAccion(true);

    try {
      for (const item of cot.productos_seleccionados) {
        const { data: prod } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.id)
          .single();
        await supabase
          .from('productos')
          .update({ stock: (prod?.stock || 0) - item.cantidad })
          .eq('id', item.id);
      }

      const ahoraVzla = new Date().toISOString();
      await supabase
        .from('cotizaciones')
        .update({ estado: 'aprobado', fecha_aprobacion: ahoraVzla })
        .eq('id', cot.id);

      const listaItems = cot.productos_seleccionados
        .map((item: any) => `▪️ ${item.cantidad}x ${item.nombre.toUpperCase()}`)
        .join('\n');
      const esBS = cot.moneda === 'BS';
      const montoFinal = esBS ? cot.total * (cot.tasa_bcv || 1) : cot.total;

      const mensaje = `✅ *VENTA APROBADA*\n\n👤 *Cliente:* ${cot.clientes?.nombre}\n📦 *Productos:*\n${listaItems}\n\n💰 *Total:* ${esBS ? 'Bs.' : '$'} ${montoFinal.toLocaleString('es-VE')}\n🚀 _Venta procesada_`;
      await enviarNotificacionTelegram(mensaje);

      setCotizacionSeleccionada(null);
      cargarHistorial();
    } catch (e) {
      console.error(e);
      alert('Error al procesar');
    } finally {
      setProcesandoAccion(false);
    }
  };

  const historialFiltrado = cotizaciones.filter((cot) => {
    const term = busqueda.toLowerCase();
    const coincideNombre = cot.clientes?.nombre?.toLowerCase().includes(term);
    const fechaCot = new Date(cot.created_at).toISOString().split('T')[0];
    const coincideFecha = filtroFecha === '' || fechaCot === filtroFecha;
    return coincideNombre && coincideFecha;
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* DASHBOARD */}
        <section className="mb-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-5xl font-black text-slate-800 tracking-tighter italic">
                FINANZAS
              </h1>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">
                Ingresos reales en caja
              </p>
            </div>
            <button
              onClick={enviarReporteMensual}
              className="bg-slate-900 p-4 rounded-2xl text-white flex items-center gap-3 hover:bg-black transition-all"
            >
              <FileText size={20} className="text-blue-400" />
              <span className="text-xs font-black uppercase">
                Reporte Telegram
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-emerald-600 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <Wallet
                className="absolute -right-4 -top-4 opacity-20"
                size={100}
              />
              <span className="text-xs font-black uppercase opacity-80">
                Caja Bolívares
              </span>
              <h3 className="text-2xl font-black mt-1">
                Bs. {cajaBolivaresMes.toLocaleString('es-VE')}
              </h3>
            </div>

            <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <DollarSign
                className="absolute -right-4 -top-4 opacity-20"
                size={100}
              />
              <span className="text-xs font-black uppercase opacity-80">
                Caja Dólares
              </span>
              <h3 className="text-3xl font-black mt-1">
                ${cajaDolaresMes.toLocaleString()}
              </h3>
            </div>

            <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100 flex flex-col justify-center">
              <span className="text-xs font-black text-red-400 uppercase tracking-widest">
                Por Cobrar
              </span>
              <h3 className="text-2xl font-black text-red-600">
                ${totalCuentasPorCobrar.toLocaleString()}
              </h3>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 flex flex-col justify-center">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Vendido (Mes)
              </span>
              <h3 className="text-2xl font-black text-slate-800">
                ${totalVendidoMes.toLocaleString()}
              </h3>
            </div>
          </div>
        </section>

        {/* BUSCADOR */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="w-full pl-14 pr-4 py-4 bg-white rounded-2xl ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <input
            type="date"
            className="px-4 py-4 bg-white rounded-2xl ring-1 ring-slate-200 font-bold outline-none"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
          />
        </div>

        {/* LISTADO DE TARJETAS */}
        <div className="grid gap-3">
          {historialFiltrado.map((cot) => {
            const esBS = cot.moneda === 'BS';
            const tasa = cot.tasa_bcv || 1;
            const totalEnMoneda = esBS ? cot.total * tasa : cot.total;
            const pagadoEnMoneda = (cot.monto_pagado || 0) * (esBS ? tasa : 1);
            const deudaRestante = totalEnMoneda - pagadoEnMoneda;

            const estaPagado = deudaRestante <= 0.05;
            const esAbono = (cot.monto_pagado || 0) > 0 && !estaPagado;

            return (
              <div
                key={cot.id}
                className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4"
              >
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div
                    className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black ${esBS ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}
                  >
                    <span className="text-[10px] opacity-50">
                      {esBS ? 'BS' : 'USD'}
                    </span>
                    <Wallet size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase leading-none mb-1">
                      {cot.clientes?.nombre}
                    </h3>
                    <div className="flex gap-2">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-black ${cot.tipo_operacion === 'venta_directa' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {cot.tipo_operacion === 'venta_directa'
                          ? 'VENTA DIRECTA'
                          : 'COTIZACIÓN'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col md:flex-row items-center justify-end gap-6 w-full md:w-auto">
                  {/* SEMÁFORO DE PAGO */}
                  <div className="text-center md:text-right min-w-[140px]">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-tighter">
                      Estado de Pago
                    </p>
                    {estaPagado ? (
                      <span className="text-emerald-500 font-black flex items-center gap-1 justify-end text-sm">
                        <CheckCircle2 size={14} /> PAGADO
                      </span>
                    ) : esAbono ? (
                      <div className="flex flex-col items-end leading-none">
                        <span className="text-amber-500 font-black text-sm uppercase">
                          Abonado
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Resta: {esBS ? 'Bs.' : '$'}{' '}
                          {deudaRestante.toLocaleString('es-VE')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-red-500 font-black text-sm uppercase flex items-center gap-1">
                        <AlertCircle size={14} /> Pendiente
                      </span>
                    )}
                  </div>

                  {/* MONTO TOTAL VS REF */}
                  <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 text-right min-w-[150px]">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Monto Total
                    </p>
                    <p
                      className={`text-xl font-black ${esBS ? 'text-emerald-600' : 'text-blue-600'}`}
                    >
                      {esBS ? 'Bs.' : '$'}{' '}
                      {totalEnMoneda.toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 italic">
                      {esBS
                        ? `Ref. $${cot.total}`
                        : `Ref. Bs. ${(cot.total * tasa).toLocaleString('es-VE')}`}
                    </p>
                  </div>

                  <button
                    onClick={() => setCotizacionSeleccionada(cot)}
                    className="p-4 bg-slate-900 rounded-2xl text-white hover:scale-105 transition-all"
                  >
                    <Eye size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL DETALLE (Simplificado) */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                <h2 className="text-2xl font-black text-slate-800 uppercase">
                  Detalle Operación
                </h2>
                <button
                  onClick={() => setCotizacionSeleccionada(null)}
                  className="p-3 bg-slate-200 rounded-full"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-8">
                <p className="text-xs font-black text-slate-400 uppercase">
                  Cliente
                </p>
                <p className="text-2xl font-black mb-6">
                  {cotizacionSeleccionada.clientes?.nombre}
                </p>

                <table className="w-full mb-6 text-sm">
                  <thead className="text-slate-400 uppercase text-[10px] border-b">
                    <tr>
                      <th className="text-left pb-2">Producto</th>
                      <th className="text-center pb-2">Cant</th>
                      <th className="text-right pb-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cotizacionSeleccionada.productos_seleccionados.map(
                      (item: any, i: number) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="py-3 font-bold">{item.nombre}</td>
                          <td className="py-3 text-center">{item.cantidad}</td>
                          <td className="py-3 text-right font-black">
                            $ {(item.precio * item.cantidad).toLocaleString()}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>

                <div
                  className={`p-8 rounded-[2rem] text-white ${cotizacionSeleccionada.estado === 'pendiente' ? 'bg-slate-900' : 'bg-blue-600'}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black opacity-60">
                        TOTAL EN {cotizacionSeleccionada.moneda}
                      </p>
                      <h4 className="text-4xl font-black">
                        {cotizacionSeleccionada.moneda === 'BS'
                          ? `Bs. ${(cotizacionSeleccionada.total * cotizacionSeleccionada.tasa_bcv).toLocaleString('es-VE')}`
                          : `$${cotizacionSeleccionada.total.toLocaleString()}`}
                      </h4>
                    </div>
                    {cotizacionSeleccionada.estado === 'pendiente' && (
                      <button
                        onClick={() =>
                          aprobarCotizacion(cotizacionSeleccionada)
                        }
                        disabled={procesandoAccion}
                        className="bg-emerald-500 px-6 py-4 rounded-2xl font-black flex items-center gap-2"
                      >
                        {procesandoAccion ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <CheckCircle2 />
                        )}{' '}
                        APROBAR
                      </button>
                    )}
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
