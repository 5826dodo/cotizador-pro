'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { enviarNotificacionTelegram } from '../../lib/telegram';
import {
  FileText,
  Calendar,
  X,
  Eye,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
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

  // --- LÓGICA DE MÉTRICAS (CAJAS SEPARADAS) ---
  const ventasAprobadas = cotizaciones.filter((c) => c.estado === 'aprobado');

  // 1. Dinero en Dólares (Solo lo que se vendió en moneda USD)
  const cajaDolaresMes = ventasAprobadas
    .filter(
      (c) =>
        new Date(c.created_at).getMonth() === new Date().getMonth() &&
        c.moneda !== 'BS',
    )
    .reduce((acc, curr) => acc + curr.total, 0);

  // 2. Dinero en Bolívares (Solo lo que se vendió en moneda BS)
  const cajaBolivaresMes = ventasAprobadas
    .filter(
      (c) =>
        new Date(c.created_at).getMonth() === new Date().getMonth() &&
        c.moneda === 'BS',
    )
    .reduce((acc, curr) => acc + curr.total * (curr.tasa_bcv || 1), 0);

  // 3. Meta General (Llevando todo a una base USD para ver rendimiento)
  const totalEquivalenteMes = ventasAprobadas
    .filter((c) => new Date(c.created_at).getMonth() === new Date().getMonth())
    .reduce((acc, curr) => acc + curr.total, 0);

  // 4. Dinero que aún nos deben (Cuentas por cobrar)
  const totalCuentasPorCobrar = cotizaciones
    .filter(
      (c) => c.tipo_operacion === 'venta_directa' || c.estado === 'aprobado',
    )
    .reduce((acc, curr) => acc + (curr.total - (curr.monto_pagado || 0)), 0);
  // --- ACCIONES ---
  const enviarReporteMensual = async () => {
    const mesNombre = new Date()
      .toLocaleString('es-ES', { month: 'long' })
      .toUpperCase();

    const mensajeReporte =
      `📊 *ESTADÍSTICAS DE VENTA - ${mesNombre}*\n` +
      `--------------------------\n` +
      `🇻🇪 *Caja Bolívares:* \n*Bs. ${cajaBolivaresMes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}*\n\n` +
      `💵 *Caja Dólares:* \n*$${cajaDolaresMes.toLocaleString()}*\n` +
      `--------------------------\n` +
      `📈 *Ventas Totales:* ${ventasAprobadas.length}\n` +
      `🚀 _Reporte de Flujo de Caja_`;

    await enviarNotificacionTelegram(mensajeReporte);
    alert('Reporte detallado enviado a Telegram');
  };

  const aprobarCotizacion = async (cot: any) => {
    const confirmar = confirm('¿Confirmar venta y descontar stock?');
    if (!confirmar) return;
    setProcesandoAccion(true);

    try {
      // 1. Descontar stock en Supabase
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

      // 2. Cambiar estado Y guardar FECHA DE APROBACIÓN REAL
      const ahoraVzla = new Date().toISOString(); // Guardamos el momento exacto

      await supabase
        .from('cotizaciones')
        .update({
          estado: 'aprobado',
          fecha_aprobacion: ahoraVzla, // <--- Nueva columna
        })
        .eq('id', cot.id);

      // 3. CONSTRUIR LISTA DE ITEMS PARA TELEGRAM
      const listaItems = cot.productos_seleccionados
        .map((item: any) => `▪️ ${item.cantidad}x ${item.nombre.toUpperCase()}`)
        .join('\n');

      // 4. PREPARAR MONTOS SEGÚN MONEDA GUARDADA
      const esBS = cot.moneda === 'BS';
      const simbolo = esBS ? 'Bs.' : '$';
      const montoFinal = esBS ? cot.total * (cot.tasa_bcv || 1) : cot.total;

      // 5. MENSAJE FINAL
      const mensaje =
        `✅ *VENTA APROBADA*\n\n` +
        `👤 *Cliente:* ${cot.clientes?.nombre}\n` +
        `📦 *Productos:*\n${listaItems}\n\n` +
        `💰 *Total Cobrado:* ${simbolo} ${montoFinal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n` +
        `${esBS ? `📈 *Tasa:* ${cot.tasa_bcv} Bs/$` : `💵 *Referencia:* $${cot.total.toLocaleString()}`}\n\n` +
        `🚀 _Venta procesada exitosamente_`;

      await enviarNotificacionTelegram(mensaje);

      setCotizacionSeleccionada(null);
      cargarHistorial(); // Refrescar la lista
      alert('Venta aprobada y reporte enviado');
    } catch (e) {
      console.error(e);
      alert('Error al procesar la aprobación');
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
        {/* DASHBOARD CON CAJAS SEPARADAS */}
        <section className="mb-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-5xl font-black text-slate-800 tracking-tighter italic">
                FINANZAS
              </h1>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">
                Resumen de ingresos reales
              </p>
            </div>
            <button
              onClick={enviarReporteMensual}
              className="bg-slate-900 p-4 rounded-2xl text-white flex items-center gap-3 hover:bg-black transition-all"
            >
              <FileText size={20} className="text-blue-400" />
              <span className="text-xs font-black uppercase">
                Enviar Reporte
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CAJA BS */}
            <div className="bg-emerald-600 p-6 rounded-[2.5rem] shadow-xl shadow-emerald-100 text-white relative overflow-hidden">
              <Wallet
                className="absolute -right-4 -top-4 opacity-20"
                size={120}
              />
              <span className="text-xs font-black uppercase tracking-widest opacity-80">
                Efectivo / Transferencia BS
              </span>
              <h3 className="text-3xl font-black mt-1">
                Bs. {cajaBolivaresMes.toLocaleString('es-VE')}
              </h3>
              <p className="text-[10px] font-bold mt-2 bg-white/20 inline-block px-2 py-1 rounded">
                MES ACTUAL
              </p>
            </div>

            {/* CAJA USD */}
            <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-xl shadow-blue-100 text-white relative overflow-hidden">
              <DollarSign
                className="absolute -right-4 -top-4 opacity-20"
                size={120}
              />
              <span className="text-xs font-black uppercase tracking-widest opacity-80">
                Divisas USD
              </span>
              <h3 className="text-4xl font-black mt-1">
                ${cajaDolaresMes.toLocaleString()}
              </h3>
              <p className="text-[10px] font-bold mt-2 bg-white/20 inline-block px-2 py-1 rounded">
                MES ACTUAL
              </p>
            </div>
            {/* CAJA CUENTAS POR COBRAR */}
            <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-black text-red-400 uppercase tracking-widest">
                Por Cobrar (Deuda Total)
              </span>
              <h3 className="text-3xl font-black text-red-600">
                ${totalCuentasPorCobrar.toLocaleString()}
              </h3>
              <p className="text-[10px] font-bold text-red-400 mt-1">
                CLIENTES PENDIENTES
              </p>
            </div>

            {/* RENDIMIENTO (HÍBRIDO) */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Ventas Totales (Ref $)
              </span>
              <h3 className="text-3xl font-black text-slate-800">
                ${totalEquivalenteMes.toLocaleString()}
              </h3>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-800"
                    style={{ width: '65%' }}
                  ></div>
                </div>
                <span className="text-[10px] font-black text-slate-400">
                  65% META
                </span>
              </div>
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
              placeholder="Buscar por cliente o empresa..."
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

        {/* LISTADO */}
        <div className="grid gap-3">
          {historialFiltrado.map((cot) => (
            <div
              key={cot.id}
              className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4"
            >
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black ${cot.moneda === 'BS' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}
                >
                  {cot.moneda === 'BS' ? 'Bs' : '$'}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tight">
                    {cot.clientes?.nombre}
                  </h3>
                  {/* BADGE DE TIPO DE OPERACIÓN */}
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-md font-black ${cot.tipo_operacion === 'venta_directa' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {cot.tipo_operacion === 'venta_directa'
                      ? 'VENTA'
                      : 'COTIZACIÓN'}
                  </span>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                    {new Date(cot.created_at).toLocaleDateString()} •{' '}
                    {/* Lógica de estado de pago */}
                    {cot.tipo_operacion === 'venta_directa' && (
                      <span
                        className={`ml-2 ${cot.monto_pagado >= cot.total ? 'text-emerald-500' : 'text-red-500 underline'}`}
                      >
                        {cot.monto_pagado >= cot.total
                          ? 'PAGADO'
                          : `DEBE: $${(cot.total - cot.monto_pagado).toLocaleString()}`}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    {new Date(cot.created_at).toLocaleDateString()} •{' '}
                    {cot.estado === 'pendiente' ? (
                      <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 shadow-sm animate-pulse">
                        <AlertCircle size={14} />
                        Pendiente
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500 text-white border border-emerald-600 shadow-md">
                        <CheckCircle2 size={14} />
                        Aprobado
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between w-full md:w-auto gap-6">
                <div className="text-right">
                  {cot.moneda === 'BS' ? (
                    <p className="text-2xl font-black text-emerald-600">
                      Bs.{' '}
                      {(cot.total * (cot.tasa_bcv || 1)).toLocaleString(
                        'es-VE',
                      )}
                    </p>
                  ) : (
                    <p className="text-2xl font-black text-blue-600">
                      ${cot.total.toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setCotizacionSeleccionada(cot)}
                  className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
                >
                  <Eye size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL DETALLE */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white w-full max-w-2xl rounded-t-[3rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                <h2 className="text-2xl font-black text-slate-800 uppercase italic">
                  Detalle de Operación
                </h2>
                <button
                  onClick={() => setCotizacionSeleccionada(null)}
                  className="p-3 bg-slate-200 rounded-full text-slate-600"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="p-8 max-h-[50vh] overflow-y-auto">
                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-1">
                    Cliente Seleccionado
                  </p>
                  <p className="text-2xl font-black text-slate-800 uppercase">
                    {cotizacionSeleccionada.clientes?.nombre}
                  </p>
                </div>
                <table className="w-full">
                  <thead className="border-b text-[10px] font-black text-slate-400 uppercase">
                    <tr>
                      <th className="text-left pb-4">Producto</th>
                      <th className="text-center pb-4">Cant.</th>
                      <th className="text-right pb-4">Subtotal ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cotizacionSeleccionada.productos_seleccionados.map(
                      (item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-4 font-bold text-slate-700 uppercase text-sm">
                            {item.nombre}
                          </td>
                          <td className="py-4 text-center font-bold text-slate-400">
                            {item.cantidad}
                          </td>
                          <td className="py-4 text-right font-black text-blue-600">
                            ${(item.precio * item.cantidad).toLocaleString()}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <div
                className={`p-10 flex flex-col gap-6 ${cotizacionSeleccionada.estado === 'pendiente' ? 'bg-slate-900' : 'bg-blue-600'} text-white`}
              >
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-xs font-black opacity-60 uppercase tracking-widest">
                      Pago en {cotizacionSeleccionada.moneda || 'USD'}
                    </span>
                    {cotizacionSeleccionada.moneda === 'BS' ? (
                      <h4 className="text-5xl font-black italic">
                        Bs.{' '}
                        {(
                          cotizacionSeleccionada.total *
                          cotizacionSeleccionada.tasa_bcv
                        ).toLocaleString('es-VE')}
                      </h4>
                    ) : (
                      <h4 className="text-5xl font-black italic">
                        ${cotizacionSeleccionada.total.toLocaleString()}
                      </h4>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black opacity-60 uppercase">
                      Tasa BCV
                    </p>
                    <p className="text-xl font-black italic">
                      {cotizacionSeleccionada.tasa_bcv} Bs
                    </p>
                  </div>
                </div>

                {cotizacionSeleccionada.estado === 'pendiente' && (
                  <button
                    onClick={() => aprobarCotizacion(cotizacionSeleccionada)}
                    disabled={procesandoAccion}
                    className="w-full bg-green-500 hover:bg-green-400 py-6 rounded-[2rem] text-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95"
                  >
                    {procesandoAccion ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={32} />
                    )}
                    CONFIRMAR VENTA
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
