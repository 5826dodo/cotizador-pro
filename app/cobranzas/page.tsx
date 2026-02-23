'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Search,
  Phone,
  MessageCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default function CobranzaPage() {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargarCuentasPorCobrar = async () => {
    setCargando(true);
    try {
      // 1. Traemos las que están aprobadas
      const { data, error } = await supabase
        .from('cotizaciones')
        .select(
          `
          *,
          clientes (
            nombre,
            apellido,
            telefono,
            empresa
          )
        `,
        )
        .eq('estado', 'aprobado') // Debe estar aprobada para ser una deuda real
        .order('created_at', { ascending: true });

      if (data) {
        // 2. Filtramos manualmente las que realmente deben (Total > Monto Pagado)
        // Esto evita errores si estado_pago es null o está mal escrito
        const conDeuda = data.filter((cot) => {
          const deuda = cot.total - (cot.monto_pagado || 0);
          return deuda > 0.05; // Margen de 5 centavos para redondear
        });

        setCuentas(conDeuda);
      }
    } catch (error) {
      console.error('Error cargando cobranza:', error);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarCuentasPorCobrar();
  }, []);

  // Calcular días de atraso
  const calcularDias = (fecha: string) => {
    const inicio = new Date(fecha);
    const hoy = new Date();
    const diff = hoy.getTime() - inicio.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER DE COBRANZA */}
        <header className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter">
            Panel de <span className="text-orange-600">Cobranza</span>
          </h1>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">
            Seguimiento de cuentas pendientes
          </p>
        </header>

        {/* RESUMEN DE DEUDA */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl">
            <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.3em] mb-2">
              Total por recuperar
            </p>
            <h2 className="text-5xl font-black italic">
              $
              {cuentas
                .reduce((acc, c) => acc + (c.total - (c.monto_pagado || 0)), 0)
                .toFixed(2)}
            </h2>
          </div>
          <div className="bg-white p-8 rounded-[3rem] border-4 border-red-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-red-400 tracking-[0.3em] mb-2">
                Casos Pendientes
              </p>
              <h2 className="text-5xl font-black text-red-600 italic">
                {cuentas.length}
              </h2>
            </div>
            <AlertTriangle size={60} className="text-red-100" />
          </div>
        </section>

        {/* BUSCADOR */}
        <div className="relative mb-6">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar por cliente o empresa..."
            className="w-full pl-16 pr-8 py-6 bg-white rounded-[2rem] shadow-sm border-none ring-2 ring-slate-100 focus:ring-orange-500 outline-none font-bold transition-all"
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* TABLA / LISTA DE COBRANZA */}
        <div className="space-y-4">
          {cuentas
            .filter(
              (c) =>
                c.clientes?.nombre
                  ?.toLowerCase()
                  .includes(busqueda.toLowerCase()) ||
                c.clientes?.empresa
                  ?.toLowerCase()
                  .includes(busqueda.toLowerCase()),
            )
            .map((cta) => {
              const dias = calcularDias(cta.created_at);
              const deuda = cta.total - (cta.monto_pagado || 0);

              return (
                <div
                  key={cta.id}
                  className="bg-white rounded-[2.5rem] p-6 shadow-sm border-2 border-transparent hover:border-orange-200 transition-all group"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    {/* CLIENTE Y TIEMPO */}
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-4 rounded-2xl ${dias > 15 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}
                      >
                        <Calendar size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800 uppercase italic leading-none mb-1">
                          {cta.clientes?.nombre} {cta.clientes?.apellido}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {cta.clientes?.empresa || 'Particular'} •{' '}
                          <span
                            className={
                              dias > 15 ? 'text-red-500 font-black' : ''
                            }
                          >
                            Hace {dias} días
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* MONTO Y ACCIONES */}
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                      <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                          Saldo Deudor
                        </p>
                        <p className="text-xl font-black text-slate-900">
                          ${deuda.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {/* Botón WhatsApp */}
                        <a
                          href={`https://wa.me/${cta.clientes?.telefono}?text=Hola%20${cta.clientes?.nombre},%20te%20escribimos%20de%20parte%20de%20la%20administración%20para%20recordarte%20tu%20saldo%20pendiente%20de%20$${deuda.toFixed(2)}.`}
                          target="_blank"
                          className="p-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                        >
                          <MessageCircle size={20} />
                        </a>

                        {/* Botón Ir a Pagar (Aquí podrías navegar al Historial o abrir el modal) */}
                        <button className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-orange-600 transition-all shadow-xl shadow-slate-200">
                          Gestionar Pago
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </main>
  );
}
