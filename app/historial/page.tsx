'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { enviarNotificacionTelegram } from '../../lib/telegram'; // Ajusta la ruta según tu carpeta
import {
  FileText,
  Calendar,
  X,
  Eye,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false); // Nuevo estado para el botón
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

  // --- LÓGICA DE APROBACIÓN ---
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

        const stockActual = prod?.stock || 0;
        await supabase
          .from('productos')
          .update({ stock: stockActual - item.cantidad })
          .eq('id', item.id);
      }

      // 2. Cambiar estado
      await supabase
        .from('cotizaciones')
        .update({ estado: 'aprobado' })
        .eq('id', cot.id);

      // CONSTRUIR LISTA DE PRODUCTOS PARA TELEGRAM
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
        `💰 *TOTAL FACTURADO:* *$${cot.total.toLocaleString()}*\n` +
        `✅ _Stock actualizado en sistema_`;

      await enviarNotificacionTelegram(mensaje);

      alert('Venta procesada con éxito.');
      setCotizacionSeleccionada(null);
      cargarHistorial(); // Refrescar lista principal
    } catch (e) {
      alert('Error al procesar la venta');
    } finally {
      setProcesandoAccion(false);
    }
  };

  const historialFiltrado = cotizaciones.filter((cot) => {
    const term = busqueda.toLowerCase();
    const nombre = cot.clientes?.nombre?.toLowerCase() || '';
    const empresa = cot.clientes?.empresa?.toLowerCase() || '';
    return nombre.includes(term) || empresa.includes(term);
  });

  // Agrega esto antes del return de tu HistorialPage
  const ventasAprobadas = cotizaciones.filter((c) => c.estado === 'aprobado');

  const totalMes = ventasAprobadas
    .filter((c) => new Date(c.created_at).getMonth() === new Date().getMonth())
    .reduce((acc, curr) => acc + curr.total, 0);

  const totalSemana = ventasAprobadas
    .filter((c) => {
      const fecha = new Date(c.created_at);
      const hoy = new Date();
      const sieteDiasSemanas = new Date(hoy.setDate(hoy.getDate() - 7));
      return fecha >= sieteDiasSemanas;
    })
    .reduce((acc, curr) => acc + curr.total, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Historial</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-lg shadow-blue-200">
                <p className="text-xs font-bold opacity-80 uppercase tracking-widest">
                  Ventas de la Semana
                </p>
                <h2 className="text-3xl font-black">
                  ${totalSemana.toLocaleString()}
                </h2>
              </div>
              <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-lg shadow-slate-200">
                <p className="text-xs font-bold opacity-80 uppercase tracking-widest">
                  Total del Mes
                </p>
                <h2 className="text-3xl font-black">
                  ${totalMes.toLocaleString()}
                </h2>
              </div>
            </div>
            <p className="text-slate-500">Consulta y detalle de operaciones</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search
              className="absolute left-3 top-3.5 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {/* LISTADO */}
        <div className="grid gap-4">
          {historialFiltrado.map((cot) => (
            <div
              key={cot.id}
              className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4"
            >
              <div className="flex items-center gap-5 w-full md:w-auto">
                <div
                  className={`p-4 rounded-2xl ${cot.estado === 'pendiente' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}
                >
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">
                    {cot.clientes?.nombre}
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar size={12} />{' '}
                      {new Date(cot.created_at).toLocaleDateString()}
                    </p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${cot.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}
                    >
                      {cot.estado}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full md:w-auto gap-10">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Total
                  </p>
                  <p className="text-xl font-black text-blue-600">
                    ${cot.total.toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setCotizacionSeleccionada(cot)}
                  className="bg-slate-100 p-3 rounded-2xl text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
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
                  <p className="text-xs text-slate-500">
                    Cliente: {cotizacionSeleccionada.clientes?.nombre}
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

              {/* FOOTER DEL MODAL CON ACCIÓN */}
              <div
                className={`p-8 flex justify-between items-center ${cotizacionSeleccionada.estado === 'pendiente' ? 'bg-slate-900' : 'bg-blue-600'} text-white`}
              >
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest">
                    Total Cotizado
                  </p>
                  <p className="text-3xl font-black">
                    ${cotizacionSeleccionada.total.toLocaleString()}
                  </p>
                </div>

                {cotizacionSeleccionada.estado === 'pendiente' ? (
                  <button
                    onClick={() => aprobarCotizacion(cotizacionSeleccionada)}
                    disabled={procesandoAccion}
                    className="bg-green-500 hover:bg-green-400 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {procesandoAccion ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={20} />
                    )}
                    APROBAR VENTA
                  </button>
                ) : (
                  <div className="text-right">
                    <p className="text-xs opacity-80 italic">
                      Esta cotización ya fue procesada
                    </p>
                    <p className="font-bold flex items-center gap-1 justify-end">
                      <CheckCircle2 size={16} /> VENTA COMPLETADA
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
