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

// Si tienes el modal en otro archivo, impórtalo así:
// import ModalAbono from '@/components/ModalAbono';

export default function CobranzaPage() {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // --- ESTADO QUE FALTABA ---
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);

  const cargarCuentasPorCobrar = async () => {
    setCargando(true);
    try {
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

          if (cot.tipo_operacion === 'venta_directa' && tieneDeuda) return true;
          if (
            cot.tipo_operacion === 'cotizacion' &&
            cot.estado === 'aprobado' &&
            tieneDeuda
          )
            return true;

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

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* ... (Header y Resumen igual que antes) ... */}
        <header className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter">
            Panel de <span className="text-orange-600">Cobranza</span>
          </h1>
        </header>

        {/* BUSCADOR */}
        <div className="relative mb-6">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar por cliente o empresa..."
            className="w-full pl-16 pr-8 py-6 bg-white rounded-[2rem] shadow-sm border-none ring-2 ring-slate-100 focus:ring-orange-500 outline-none font-bold"
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* LISTA DE COBRANZA */}
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
              const deudaUsd = cta.total - (cta.monto_pagado || 0);
              const deudaBs = deudaUsd * (cta.tasa_bcv || 1);

              return (
                <div
                  key={cta.id}
                  className="bg-white rounded-[2.5rem] p-6 shadow-sm border-2 border-slate-50 hover:border-orange-200 transition-all"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-[8px] px-2 py-1 rounded-full font-black text-white uppercase ${cta.tipo_operacion === 'venta_directa' ? 'bg-orange-500' : 'bg-blue-500'}`}
                        >
                          {cta.tipo_operacion}
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
                      <p className="text-2xl font-black text-red-600 tracking-tighter">
                        {cta.moneda === 'BS'
                          ? `Bs. ${deudaBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                          : `$${deudaUsd.toFixed(2)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setCotizacionSeleccionada(cta)}
                      className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase hover:bg-orange-600 transition-all"
                    >
                      Registrar Pago / Abono
                    </button>
                    <a
                      href={`https://wa.me/${cta.clientes?.telefono}`}
                      target="_blank"
                      className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"
                    >
                      <MessageCircle size={18} />
                    </a>
                  </div>
                </div>
              );
            })}
        </div>

        {/* --- AQUÍ DEBES RENDERIZAR TU MODAL --- */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full shadow-2xl">
              <h2 className="text-2xl font-black uppercase italic mb-4">
                Registrar Abono
              </h2>
              <p className="text-sm font-bold text-slate-500 mb-6">
                Cliente: {cotizacionSeleccionada.clientes?.nombre} <br />
                Deuda Total: $
                {(
                  cotizacionSeleccionada.total -
                  (cotizacionSeleccionada.monto_pagado || 0)
                ).toFixed(2)}
              </p>

              {/* Aquí va tu formulario de abono que creamos anteriormente */}

              <button
                onClick={() => setCotizacionSeleccionada(null)}
                className="w-full mt-4 py-3 text-slate-400 font-bold uppercase text-[10px]"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
