'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  FileText,
  Calendar,
  User,
  Search,
  Eye,
  X,
  Package,
  DollarSign,
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);

  useEffect(() => {
    const cargarHistorial = async () => {
      const { data } = await supabase
        .from('cotizaciones')
        .select(`*, clientes ( nombre, empresa )`)
        .order('created_at', { ascending: false });

      if (data) setCotizaciones(data);
      setCargando(false);
    };
    cargarHistorial();
  }, []);

  const historialFiltrado = cotizaciones.filter((cot) => {
    const term = busqueda.toLowerCase();
    const nombre = cot.clientes?.nombre?.toLowerCase() || '';
    const empresa = cot.clientes?.empresa?.toLowerCase() || '';
    return nombre.includes(term) || empresa.includes(term);
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Historial</h1>
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
                <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">
                    {cot.clientes?.nombre}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12} />{' '}
                    {new Date(cot.created_at).toLocaleDateString()}
                  </p>
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

              <div className="p-6 max-h-[60vh] overflow-y-auto">
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

              <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest">
                    Total Facturado
                  </p>
                  <p className="text-3xl font-black">
                    ${cotizacionSeleccionada.total.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-80 italic">
                    Estado: {cotizacionSeleccionada.estado.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
