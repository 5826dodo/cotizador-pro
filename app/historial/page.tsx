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

  // --- LÓGICA DE CÁLCULOS PARA DASHBOARD (Convertido a USD para métricas uniformes) ---
  const ventasAprobadas = cotizaciones.filter((c) => c.estado === 'aprobado');

  // Total Mes (Todo llevado a USD para poder comparar con la meta)
  const totalMes = ventasAprobadas
    .filter((c) => new Date(c.created_at).getMonth() === new Date().getMonth())
    .reduce((acc, curr) => acc + curr.total, 0);

  // Total Semana (Todo llevado a USD)
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

    // Desglose para el reporte
    const enDolares = ventasAprobadas
      .filter(
        (c) =>
          new Date(c.created_at).getMonth() === new Date().getMonth() &&
          c.moneda !== 'BS',
      )
      .reduce((acc, curr) => acc + curr.total, 0);

    const enBolivares = ventasAprobadas
      .filter(
        (c) =>
          new Date(c.created_at).getMonth() === new Date().getMonth() &&
          c.moneda === 'BS',
      )
      .reduce((acc, curr) => acc + curr.total * (curr.tasa_bcv || 1), 0);

    const mensajeReporte =
      `📊 *REPORTE DE VENTAS MENSUAL*\n` +
      `📅 *Mes:* ${mesNombre}\n` +
      `--------------------------\n` +
      `💵 *Ingresos USD:* *$${enDolares.toLocaleString()}*\n` +
      `🇻🇪 *Ingresos BS:* *Bs. ${enBolivares.toLocaleString('es-VE')}*\n` +
      `📈 *Total Equivalente:* *$${totalMes.toLocaleString()}*\n` +
      `--------------------------\n` +
      `🚀 _Generado desde el Panel Administrativo_`;

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
      await supabase
        .from('cotizaciones')
        .update({ estado: 'aprobado' })
        .eq('id', cot.id);

      const simbolo = cot.moneda === 'BS' ? 'Bs.' : '$';
      const montoFinal =
        cot.moneda === 'BS' ? cot.total * (cot.tasa_bcv || 1) : cot.total;

      const mensaje = `✅ *VENTA APROBADA*\n👤 *Cliente:* ${cot.clientes?.nombre}\n💰 *Total:* ${simbolo} ${montoFinal.toLocaleString('es-VE')}`;

      await enviarNotificacionTelegram(mensaje);
      setCotizacionSeleccionada(null);
      cargarHistorial();
    } catch (e) {
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
        {/* DASHBOARD HEADER */}
        <section className="mb-8">
          <div className="flex flex-col gap-6 mb-8">
            <div>
              <h1 className="text-5xl font-black text-slate-800 tracking-tighter italic">
                HISTORIAL
              </h1>
              <p className="text-lg text-slate-500 font-medium tracking-wide">
                Control de ingresos y ventas bi-monetario
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={24}
                />
                <input
                  type="text"
                  placeholder="Buscar por cliente..."
                  className="w-full pl-14 pr-4 py-5 bg-white rounded-[1.5rem] ring-1 ring-slate-200 text-xl font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              <input
                type="date"
                className="pl-6 pr-6 py-5 bg-white rounded-[1.5rem] ring-1 ring-slate-200 text-lg font-bold outline-none"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CARD SEMANA */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-blue-600">
                <TrendingUp size={20} />
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Semana (Ref $)
                </span>
              </div>
              <h3 className="text-3xl font-black text-slate-800">
                ${totalSemana.toLocaleString()}
              </h3>
              <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full"
                  style={{ width: `${porcentajeSemana}%` }}
                ></div>
              </div>
            </div>

            {/* CARD MES */}
            <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-xl text-white">
              <span className="text-xs font-black uppercase tracking-widest opacity-80">
                Mes (Ref $)
              </span>
              <h3 className="text-4xl font-black mt-1">
                ${totalMes.toLocaleString()}
              </h3>
              <div className="inline-flex items-center gap-1 mt-3 text-xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase">
                {ventasAprobadas.length} Ventas Totales
              </div>
            </div>

            {/* CARD APROBADAS */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Estado Aprobado
              </span>
              <h3 className="text-3xl font-black text-slate-800">
                {ventasAprobadas.length}
              </h3>
            </div>

            {/* BOTON REPORTE */}
            <button
              onClick={enviarReporteMensual}
              className="bg-slate-900 hover:bg-black p-6 rounded-[2.5rem] text-white flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group"
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

        {/* LISTADO DE OPERACIONES */}
        <div className="grid gap-4 mb-20">
          {historialFiltrado.map((cot) => (
            <div
              key={cot.id}
              className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6"
            >
              <div className="flex items-center gap-5 w-full md:w-auto">
                <div
                  className={`p-5 rounded-2xl ${cot.moneda === 'BS' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}
                >
                  {cot.moneda === 'BS' ? (
                    <span className="font-black text-xl">Bs</span>
                  ) : (
                    <DollarSign size={32} />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-2xl tracking-tight leading-none mb-2">
                    {cot.clientes?.nombre}
                  </h3>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-slate-400 font-bold">
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
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Monto Operación
                  </p>
                  {cot.moneda === 'BS' ? (
                    <>
                      <p className="text-3xl font-black text-emerald-600 leading-none">
                        Bs.{' '}
                        {(cot.total * (cot.tasa_bcv || 1)).toLocaleString(
                          'es-VE',
                          { minimumFractionDigits: 2 },
                        )}
                      </p>
                      <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase">
                        Ref: ${cot.total.toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-black text-blue-600 leading-none">
                        ${cot.total.toLocaleString()}
                      </p>
                      <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase">
                        Ref: Bs.{' '}
                        {(cot.total * (cot.tasa_bcv || 1)).toLocaleString(
                          'es-VE',
                        )}
                      </p>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setCotizacionSeleccionada(cot)}
                  className="bg-slate-100 p-5 rounded-3xl text-slate-600 hover:bg-blue-600 hover:text-white transition-all active:scale-90"
                >
                  <Eye size={28} />
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
