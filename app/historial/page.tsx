'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  FileText,
  Calendar,
  User,
  Search,
  ExternalLink,
  Hash,
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarHistorial = async () => {
      const { data, error } = await supabase
        .from('cotizaciones')
        .select(
          `
          *,
          clientes ( nombre, empresa )
        `,
        )
        .order('created_at', { ascending: false });

      if (data) setCotizaciones(data);
      setCargando(false);
    };
    cargarHistorial();
  }, []);

  // Lógica de filtrado por Cliente o Empresa
  const historialFiltrado = cotizaciones.filter((cot) => {
    const term = busqueda.toLowerCase();
    const nombreCliente = cot.clientes?.nombre?.toLowerCase() || '';
    const empresaCliente = cot.clientes?.empresa?.toLowerCase() || '';
    return nombreCliente.includes(term) || empresaCliente.includes(term);
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* ENCABEZADO Y BUSCADOR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Historial</h1>
            <p className="text-slate-500">
              Consulta tus cotizaciones generadas
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search
              className="absolute left-3 top-3.5 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar por cliente o empresa..."
              className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="font-medium">Cargando registros...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {historialFiltrado.map((cot) => (
              <div
                key={cot.id}
                className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group"
              >
                <div className="flex items-center gap-5">
                  <div className="bg-slate-100 p-4 rounded-2xl text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Hash size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">
                      {cot.clientes?.nombre || 'Cliente no encontrado'}
                    </h3>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <Calendar size={14} className="text-blue-500" />
                        {new Date(cot.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <User size={14} className="text-blue-500" />
                        {cot.clientes?.empresa || 'Venta Particular'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-8 border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="text-left md:text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">
                      Monto Total
                    </p>
                    <p className="text-2xl font-black text-blue-600">
                      ${cot.total.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      alert('Próxima mejora: Ver detalle de productos')
                    }
                    className="bg-blue-50 p-3.5 rounded-2xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90"
                  >
                    <ExternalLink size={20} />
                  </button>
                </div>
              </div>
            ))}

            {historialFiltrado.length === 0 && !cargando && (
              <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
                <FileText className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-slate-400 font-medium">
                  No se encontraron resultados para "{busqueda}"
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
