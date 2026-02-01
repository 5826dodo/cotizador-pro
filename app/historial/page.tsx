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
  ArrowRight,
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
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

  // --- LÓGICA DE CÁLCULOS PARA DASHBOARD ---
  const ventasAprobadas = cotizaciones.filter((c) => c.estado === 'aprobado');

  const totalMes = ventasAprobadas
    .filter((c) => new Date(c.created_at).getMonth() === new Date().getMonth())
    .reduce((acc, curr) => acc + curr.total, 0);

  const totalSemana = ventasAprobadas
    .filter((c) => {
      const fecha = new Date(c.created_at);
      const hoy = new Date();
      const hace7Dias = new Date(hoy.setDate(hoy.getDate() - 7));
      return fecha >= hace7Dias;
    })
    .reduce((acc, curr) => acc + curr.total, 0);

  // Simulación de meta semanal para el mini-chart (ajustar según necesidad)
  const metaSemanal = 5000;
  const porcentajeSemana = Math.min((totalSemana / metaSemanal) * 100, 100);

  // --- ACCIONES ---
  const enviarReporteMensual = async () => {
    const mesNombre = new Date()
      .toLocaleString('es-ES', { month: 'long' })
      .toUpperCase();
    const ventasMesActual = ventasAprobadas.filter(
      (c) => new Date(c.created_at).getMonth() === new Date().getMonth(),
    );

    const mensajeReporte =
      `📊 *REPORTE DE VENTAS MENSUAL*\n` +
      `📅 *Mes:* ${mesNombre}\n` +
      `--------------------------\n` +
      `💰 *Ingresos Totales:* *$${totalMes.toLocaleString()}*\n` +
      `📝 *Ventas Cerradas:* ${ventasMesActual.length}\n` +
      `--------------------------\n` +
      `🚀 _Generado desde el Panel Administrativo_`;

    await enviarNotificacionTelegram(mensajeReporte);
    alert('Reporte enviado a Telegram con éxito');
  };

  const aprobarCotizacion = async (cot: any) => {
    const confirmar = confirm(
      '¿Confirmar venta? Se descontará el stock de los productos.',
    );
    if (!confirmar) return;

    setProcesandoAccion(true);
    try {
      // 1. Descontar Stock
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

      // 2. Cambiar estado
      await supabase
        .from('cotizaciones')
        .update({ estado: 'aprobado' })
        .eq('id', cot.id);

      // 3. Notificación detallada a Telegram
      const listaProductos = cot.productos_seleccionados
        .map(
          (item: any) =>
            `• ${item.cantidad}x ${item.nombre} — *$${(item.precio * item.cantidad).toLocaleString()}*`,
        )
        .join('\n');

      const mensaje =
        `✅ *VENTA APROBADA*\n` +
        `--------------------------\n` +
        `👤 *Cliente:* ${cot.clientes?.nombre}\n` +
        `🏢 *Empresa:* ${cot.clientes?.empresa || 'N/A'}\n` +
        `--------------------------\n` +
        `📦 *Detalle:* \n${listaProductos}\n` +
        `--------------------------\n` +
        `💰 *TOTAL:* *$${cot.total.toLocaleString()}*`;

      await enviarNotificacionTelegram(mensaje);
      alert('Venta procesada con éxito.');
      setCotizacionSeleccionada(null);
      cargarHistorial();
    } catch (e) {
      alert('Error al procesar la venta');
    } finally {
      setProcesandoAccion(false);
    }
  };

  const historialFiltrado = cotizaciones.filter((cot) => {
    const term = busqueda.toLowerCase();
    return (
      cot.clientes?.nombre?.toLowerCase().includes(term) ||
      cot.clientes?.empresa?.toLowerCase().includes(term)
    );
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* DASHBOARD TOP SECTION */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-black text-slate-800 tracking-tight">
                Historial
              </h1>
              <p className="text-slate-500 font-medium">
                Control de ingresos y cotizaciones
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar cliente o empresa..."
                className="w-full pl-12 pr-4 py-4 bg-white rounded-[1.5rem] border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          {/* CARDS RESPONSIVAS (Grid de 2x2 en móvil, 4x1 en PC) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4 text-blue-600">
                <TrendingUp size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Esta Semana
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-800">
                ${totalSemana.toLocaleString()}
              </h3>
              <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${porcentajeSemana}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-xl shadow-blue-200 col-span-2 lg:col-span-1 text-white relative overflow-hidden group">
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  Total del Mes
                </span>
                <h3 className="text-2xl font-black mt-1">
                  ${totalMes.toLocaleString()}
                </h3>
                <div className="flex items-center gap-1 mt-2 text-[10px] font-bold bg-white/20 w-fit px-2 py-1 rounded-lg">
                  <CheckCircle2 size={12} />{' '}
                  {
                    ventasAprobadas.filter(
                      (c) =>
                        new Date(c.created_at).getMonth() ===
                        new Date().getMonth(),
                    ).length
                  }{' '}
                  VENTAS
                </div>
              </div>
              <FileText
                className="absolute -right-4 -bottom-4 text-blue-500/20 group-hover:scale-110 transition-transform"
                size={100}
              />
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm col-span-1 lg:col-span-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                Aprobadas
              </span>
              <h3 className="text-2xl font-black text-slate-800">
                {ventasAprobadas.length}
              </h3>
              <p className="text-[10px] text-green-500 font-black mt-2 flex items-center gap-1">
                <CheckCircle2 size={12} /> SISTEMA OK
              </p>
            </div>

            <button
              onClick={enviarReporteMensual}
              className="bg-slate-900 hover:bg-black p-6 rounded-[2.5rem] text-white flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group col-span-1 lg:col-span-1 border-2 border-transparent hover:border-blue-500/50"
            >
              <div className="p-2 bg-white/10 rounded-xl group-hover:bg-blue-600 transition-colors">
                <FileText size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-tighter text-center">
                Enviar Reporte
              </span>
            </button>
          </div>
        </section>

        {/* LISTADO DE COTIZACIONES */}
        <div className="grid gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-slate-800">
              Actividad Reciente
            </h2>
            <span className="text-xs font-bold text-slate-400">
              {historialFiltrado.length} Resultados
            </span>
          </div>

          {historialFiltrado.map((cot) => (
            <div
              key={cot.id}
              className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-5 w-full md:w-auto">
                <div
                  className={`p-4 rounded-2xl ${cot.estado === 'pendiente' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}
                >
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg leading-tight">
                    {cot.clientes?.nombre}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar size={12} />{' '}
                      {new Date(cot.created_at).toLocaleDateString()}
                    </p>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${cot.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}
                    >
                      {cot.estado}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full md:w-auto gap-10 border-t md:border-t-0 pt-4 md:pt-0">
                <div className="text-left md:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Total Cobrado
                  </p>
                  <p className="text-2xl font-black text-blue-600">
                    ${cot.total.toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setCotizacionSeleccionada(cot)}
                  className="bg-slate-100 p-4 rounded-2xl text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90"
                >
                  <Eye size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL DE DETALLE */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-xl font-black text-slate-800">
                    Detalle de Cotización
                  </h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">
                    ID: {cotizacionSeleccionada.id.split('-')[0]}
                  </p>
                </div>
                <button
                  onClick={() => setCotizacionSeleccionada(null)}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 max-h-[50vh] overflow-y-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                      <th className="pb-3 px-2">Producto</th>
                      <th className="pb-3 px-2 text-center">Cant.</th>
                      <th className="pb-3 px-2 text-right">Unit.</th>
                      <th className="pb-3 px-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cotizacionSeleccionada.productos_seleccionados.map(
                      (item: any, idx: number) => (
                        <tr key={idx} className="text-sm">
                          <td className="py-4 px-2 font-bold text-slate-700">
                            {item.nombre}
                          </td>
                          <td className="py-4 px-2 text-center text-slate-500">
                            {item.cantidad}
                          </td>
                          <td className="py-4 px-2 text-right text-slate-500">
                            ${item.precio.toLocaleString()}
                          </td>
                          <td className="py-4 px-2 text-right font-black text-blue-600">
                            ${(item.precio * item.cantidad).toLocaleString()}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <div
                className={`p-8 flex flex-col md:flex-row justify-between items-center gap-6 ${cotizacionSeleccionada.estado === 'pendiente' ? 'bg-slate-900' : 'bg-blue-600'} text-white`}
              >
                <div className="text-center md:text-left">
                  <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest text-blue-100">
                    Total a Pagar
                  </p>
                  <p className="text-4xl font-black">
                    ${cotizacionSeleccionada.total.toLocaleString()}
                  </p>
                </div>

                {cotizacionSeleccionada.estado === 'pendiente' ? (
                  <button
                    onClick={() => aprobarCotizacion(cotizacionSeleccionada)}
                    disabled={procesandoAccion}
                    className="w-full md:w-auto bg-green-500 hover:bg-green-400 text-white px-10 py-4 rounded-[1.5rem] font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {procesandoAccion ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={22} />
                    )}
                    APROBAR VENTA
                  </button>
                ) : (
                  <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/20">
                    <p className="font-black flex items-center gap-2 text-sm">
                      <CheckCircle2 size={18} className="text-green-400" />{' '}
                      VENTA COMPLETADA
                    </p>
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
