'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  FileText,
  Calendar,
  User,
  DollarSign,
  ExternalLink,
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
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

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Historial</h1>
            <p className="text-slate-500">
              Consulta tus cotizaciones generadas
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="text-center py-20 text-slate-400">
            Cargando registros...
          </div>
        ) : (
          <div className="grid gap-4">
            {cotizaciones.map((cot) => (
              <div
                key={cot.id}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">
                      {cot.clientes?.nombre || 'Cliente eliminado'}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar size={14} />{' '}
                        {new Date(cot.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <User size={14} />{' '}
                        {cot.clientes?.empresa || 'Particular'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-8 border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Monto Total
                    </p>
                    <p className="text-2xl font-black text-blue-600">
                      ${cot.total.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => alert('Próximamente: Ver detalle completo')}
                    className="bg-slate-100 p-3 rounded-xl text-slate-600 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <ExternalLink size={20} />
                  </button>
                </div>
              </div>
            ))}

            {cotizaciones.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                <p className="text-slate-400">
                  No hay cotizaciones registradas aún.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
