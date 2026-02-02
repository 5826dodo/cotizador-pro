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
  Loader2,
  TrendingUp,
  Filter,
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState(''); // Estado para el filtro de fecha
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

  const metaSemanal = 5000;
  const porcentajeSemana = Math.min((totalSemana / metaSemanal) * 100, 100);

  // --- ACCIONES ---
  const enviarReporteMensual = async () => {
    const mesNombre = new Date()
      .toLocaleString('es-ES', { month: 'long' })
      .toUpperCase();
    const mensajeReporte =
      `📊 *REPORTE DE VENTAS MENSUAL*\n` +
      `📅 *Mes:* ${mesNombre}\n` +
      `--------------------------\n` +
      `💰 *Ingresos Totales:* *$${totalMes.toLocaleString()}*\n` +
      `📝 *Ventas Cerradas:* ${ventasAprobadas.filter((c) => new Date(c.created_at).getMonth() === new Date().getMonth()).length}\n` +
      `--------------------------\n` +
      `🚀 _Generado desde el Panel Administrativo_`;

    await enviarNotificacionTelegram(mensajeReporte);
    alert('Reporte enviado a Telegram');
  };

  const aprobarCotizacion = async (cot: any) => {
    const confirmar = confirm('¿Confirmar venta?');
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
      await supabase
        .from('cotizaciones')
        .update({ estado: 'aprobado' })
        .eq('id', cot.id);

      const lista = cot.productos_seleccionados
        .map((i: any) => `• ${i.cantidad}x ${i.nombre}`)
        .join('\n');
      const mensaje = `✅ *VENTA APROBADA*\n👤 *Cliente:* ${cot.clientes?.nombre}\n📦 *Items:*\n${lista}\n💰 *Total:* *$${cot.total.toLocaleString()}*`;

      await enviarNotificacionTelegram(mensaje);
      setCotizacionSeleccionada(null);
      cargarHistorial();
    } catch (e) {
      alert('Error al procesar');
    } finally {
      setProcesandoAccion(false);
    }
  };

  // --- FILTRADO COMBINADO (Búsqueda + Fecha) ---
  const historialFiltrado = cotizaciones.filter((cot) => {
    const term = busqueda.toLowerCase();
    const coincideNombre =
      cot.clientes?.nombre?.toLowerCase().includes(term) ||
      cot.clientes?.empresa?.toLowerCase().includes(term);

    const fechaCot = new Date(cot.created_at).toISOString().split('T')[0];
    const coincideFecha = filtroFecha === '' || fechaCot === filtroFecha;

    return coincideNombre && coincideFecha;
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* DASHBOARD HEADER */}
        <section className="mb-8">
          <div className="flex flex-col gap-6 mb-8">
            <div>
              <h1 className="text-5xl font-black text-slate-800 tracking-tighter">
                Historial
              </h1>
              <p className="text-lg text-slate-500 font-medium">
                Control de ingresos y ventas
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              {/* Buscador - Letra más grande */}
              <div className="relative flex-1">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={24}
                />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  className="w-full pl-14 pr-4 py-5 bg-white rounded-[1.5rem] border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 text-xl font-medium outline-none shadow-sm transition-all"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              {/* Filtro Fecha - Estilo moderno */}
              <div className="relative">
                <Calendar
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"
                  size={22}
                />
                <input
                  type="date"
                  className="w-full md:w-auto pl-12 pr-4 py-5 bg-white rounded-[1.5rem] border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 text-lg font-bold outline-none shadow-sm"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                />
                {filtroFecha && (
                  <button
                    onClick={() => setFiltroFecha('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full text-slate-400"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* CARDS DASHBOARD - Fuente aumentada */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-2 text-blue-600">
                <TrendingUp size={20} />
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Semana
                </span>
              </div>
              <h3 className="text-3xl font-black text-slate-800">
                ${totalSemana.toLocaleString()}
              </h3>
              <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-1000"
                  style={{ width: `${porcentajeSemana}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-xl shadow-blue-200 col-span-2 lg:col-span-1 text-white">
              <span className="text-xs font-black uppercase tracking-widest opacity-80">
                Total del Mes
              </span>
              <h3 className="text-4xl font-black mt-1 tracking-tight">
                ${totalMes.toLocaleString()}
              </h3>
              <div className="inline-flex items-center gap-1 mt-3 text-xs font-bold bg-white/20 px-3 py-1 rounded-full">
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

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm col-span-1 lg:col-span-1 flex flex-col justify-center">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Aprobadas
              </span>
              <h3 className="text-3xl font-black text-slate-800">
                {ventasAprobadas.length}
              </h3>
            </div>

            <button
              onClick={enviarReporteMensual}
              className="bg-slate-900 hover:bg-black p-6 rounded-[2.5rem] text-white flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group col-span-1 lg:col-span-1"
            >
              <FileText size={28} className="text-blue-400" />
              <span className="text-xs font-black uppercase text-center leading-none">
                Reporte
                <br />
                Telegram
              </span>
            </button>
          </div>
        </section>

        {/* LISTADO DE RESULTADOS - Tarjetas más grandes */}
        <div className="grid gap-4 mb-20">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-2xl font-black text-slate-800">Operaciones</h2>
            {filtroFecha && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black uppercase">
                Filtrado por fecha
              </span>
            )}
          </div>

          {historialFiltrado.length > 0 ? (
            historialFiltrado.map((cot) => (
              <div
                key={cot.id}
                className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6"
              >
                <div className="flex items-center gap-5 w-full md:w-auto">
                  <div
                    className={`p-5 rounded-2xl ${cot.estado === 'pendiente' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}
                  >
                    <FileText size={32} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-2xl tracking-tight leading-none mb-2">
                      {cot.clientes?.nombre}
                    </h3>
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-slate-400 font-bold flex items-center gap-1">
                        <Calendar size={14} />{' '}
                        {new Date(cot.created_at).toLocaleDateString()}
                      </p>
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full uppercase ${cot.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}
                      >
                        {cot.estado}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-8 border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="text-left md:text-right">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Monto
                    </p>
                    <p className="text-3xl font-black text-blue-600">
                      ${cot.total.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setCotizacionSeleccionada(cot)}
                    className="bg-slate-100 p-5 rounded-3xl text-slate-600 hover:bg-blue-600 hover:text-white transition-all active:scale-90"
                  >
                    <Eye size={28} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-xl font-bold text-slate-400">
                No hay registros para este filtro
              </p>
            </div>
          )}
        </div>

        {/* MODAL DETALLE - Optimizado para lectura móvil */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white w-full max-w-2xl rounded-t-[3rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                <h2 className="text-2xl font-black text-slate-800">
                  Detalle de Venta
                </h2>
                <button
                  onClick={() => setCotizacionSeleccionada(null)}
                  className="p-3 bg-slate-200 rounded-full text-slate-600"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto font-medium">
                <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-sm text-blue-600 font-black uppercase">
                    Cliente
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    {cotizacionSeleccionada.clientes?.nombre}
                  </p>
                </div>

                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-black text-slate-400 uppercase tracking-widest border-b">
                      <th className="pb-4">Producto</th>
                      <th className="pb-4 text-center">Cant.</th>
                      <th className="pb-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cotizacionSeleccionada.productos_seleccionados.map(
                      (item: any, idx: number) => (
                        <tr key={idx} className="text-lg">
                          <td className="py-5 font-bold text-slate-700">
                            {item.nombre}
                          </td>
                          <td className="py-5 text-center text-slate-500">
                            {item.cantidad}
                          </td>
                          <td className="py-5 text-right font-black text-blue-600">
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
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold opacity-80">
                    Total Final
                  </span>
                  <span className="text-5xl font-black">
                    ${cotizacionSeleccionada.total.toLocaleString()}
                  </span>
                </div>

                {cotizacionSeleccionada.estado === 'pendiente' && (
                  <button
                    onClick={() => aprobarCotizacion(cotizacionSeleccionada)}
                    disabled={procesandoAccion}
                    className="w-full bg-green-500 hover:bg-green-400 py-6 rounded-[2rem] text-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-green-900/20"
                  >
                    {procesandoAccion ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={32} />
                    )}
                    APROBAR AHORA
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
