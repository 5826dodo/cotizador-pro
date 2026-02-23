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
      // Traemos TODO para filtrar con precisión en el cliente
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
        .order('created_at', { ascending: true });

      if (data) {
        const filtradas = data.filter((cot) => {
          const deuda = cot.total - (cot.monto_pagado || 0);
          const tieneDeuda = deuda > 0.05;

          // LOGICA:
          // Si es venta_directa Y debe plata -> SALE
          // Si es cotizacion Y está aprobada Y debe plata -> SALE
          if (cot.tipo_operacion === 'venta_directa' && tieneDeuda) {
            return true;
          }
          if (
            cot.tipo_operacion === 'cotizacion' &&
            cot.estado === 'aprobado' &&
            tieneDeuda
          ) {
            return true;
          }

          return false;
        });

        setCuentas(filtradas);
      }
    } catch (error) {
      console.error('Error:', error);
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
              // Dentro del .map de las cuentas:
              const deudaUsd = cta.total - (cta.monto_pagado || 0);
              // Si la cotización se hizo en BS, calculamos la deuda en BS usando la tasa que guardaste
              const deudaBs = deudaUsd * (cta.tasa_bcv || 1);

              return (
                <div
                  key={cta.id}
                  className="bg-white rounded-[2.5rem] p-6 shadow-sm border-2 border-slate-50"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-[8px] px-2 py-1 rounded-full font-black text-white uppercase ${cta.tipo_operacion === 'venta_directa' ? 'bg-orange-500' : 'bg-blue-500'}`}
                        >
                          {cta.tipo_operacion}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(cta.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 italic uppercase">
                        {cta.clientes?.nombre} {cta.clientes?.apellido}
                      </h3>
                      <p className="text-xs font-bold text-slate-500">
                        {cta.clientes?.empresa}
                      </p>
                    </div>

                    <div className="text-right bg-red-50 p-4 rounded-[1.5rem] border border-red-100">
                      <p className="text-[9px] font-black text-red-400 uppercase italic">
                        Saldo Pendiente
                      </p>
                      <p className="text-2xl font-black text-red-600 leading-none tracking-tighter">
                        {cta.moneda === 'BS'
                          ? `Bs. ${deudaBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                          : `$${deudaUsd.toFixed(2)}`}
                      </p>
                      {cta.monto_pagado > 0 && (
                        <p className="text-[8px] font-bold text-emerald-600 mt-1 uppercase">
                          Abonado:{' '}
                          {cta.moneda === 'BS'
                            ? `Bs. ${(cta.monto_pagado * cta.tasa_bcv).toFixed(2)}`
                            : `$${cta.monto_pagado}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción rápidos */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setCotizacionSeleccionada(cta)} // Usamos el mismo modal de abono
                      className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase hover:bg-orange-600 transition-all"
                    >
                      Registrar Pago / Abono
                    </button>
                    <a
                      href={`https://wa.me/${cta.clientes?.telefono}`}
                      className="p-3 bg-emerald-500 text-white rounded-xl"
                    >
                      <MessageCircle size={18} />
                    </a>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </main>
  );
}
