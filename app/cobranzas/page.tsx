'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // Ajusta la ruta según tu proyecto
import {
  DollarSign,
  Search,
  User,
  Calendar,
  ArrowRightCircle,
  Loader2,
  Filter,
} from 'lucide-react';

export default function CobranzasPage() {
  const [deudas, setDeudas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const cargarCuentasPorCobrar = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('cotizaciones')
      .select(`*, clientes ( nombre, telefono, empresa )`)
      .eq('tipo_operacion', 'venta_directa')
      .order('created_at', { ascending: false });

    if (data) {
      // Filtramos localmente los que aún deben dinero
      const pendientes = data.filter(
        (c) => c.total - (c.monto_pagado || 0) > 0.1,
      );
      setDeudas(pendientes);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarCuentasPorCobrar();
  }, []);

  const deudasFiltradas = deudas.filter((d) =>
    d.clientes?.nombre?.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const totalPendienteGlobal = deudas.reduce(
    (acc, curr) => acc + (curr.total - (curr.monto_pagado || 0)),
    0,
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* ENCABEZADO Y RESUMEN */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-5xl font-black text-slate-800 tracking-tighter italic">
              COBRANZAS
            </h1>
            <p className="text-red-500 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Cuentas pendientes por cobrar
            </p>
          </div>

          <div className="bg-white px-8 py-6 rounded-[2.5rem] shadow-xl border-2 border-red-100 flex items-center gap-6">
            <div className="bg-red-100 p-4 rounded-2xl text-red-600">
              <DollarSign size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Deuda Total
              </p>
              <h2 className="text-4xl font-black text-slate-800">
                ${totalPendienteGlobal.toLocaleString()}
              </h2>
            </div>
          </div>
        </div>

        {/* BUSCADOR */}
        <div className="relative mb-8">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar deudor por nombre..."
            className="w-full pl-14 pr-4 py-5 bg-white rounded-3xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-red-500 font-bold shadow-sm"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* LISTA DE DEUDORES */}
        {cargando ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-slate-300" size={48} />
          </div>
        ) : (
          <div className="grid gap-4">
            {deudasFiltradas.length > 0 ? (
              deudasFiltradas.map((deuda) => {
                const saldoPendiente = deuda.total - (deuda.monto_pagado || 0);
                return (
                  <div
                    key={deuda.id}
                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-center gap-6"
                  >
                    <div className="flex items-center gap-5 flex-1">
                      <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                        {deuda.clientes?.nombre?.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight leading-none mb-1">
                          {deuda.clientes?.nombre}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold flex items-center gap-2 uppercase">
                          <Calendar size={12} /> Emitida:{' '}
                          {new Date(deuda.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-12 text-center md:text-right">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                          Total Venta
                        </p>
                        <p className="font-bold text-slate-600">
                          ${deuda.total.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                          Abonado
                        </p>
                        <p className="font-bold text-emerald-500">
                          ${(deuda.monto_pagado || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-red-50 px-6 py-3 rounded-2xl border border-red-100">
                        <p className="text-[10px] font-black text-red-400 uppercase mb-1">
                          Resta por pagar
                        </p>
                        <p className="text-2xl font-black text-red-600">
                          ${saldoPendiente.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => alert('Próximamente: Registrar abono')}
                      className="p-4 bg-slate-100 text-slate-800 rounded-2xl hover:bg-slate-900 hover:text-white transition-all group"
                    >
                      <ArrowRightCircle
                        size={24}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-300">
                <p className="text-slate-400 font-bold">
                  🎉 ¡No hay cuentas pendientes por cobrar!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
