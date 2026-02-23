'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Search,
  MessageCircle,
  TrendingUp,
  Wallet,
  Clock,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';

export default function CobranzaPage() {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);

  // Estados para el resumen de las Cards
  const [resumen, setResumen] = useState({
    totalCalle: 0,
    cobradoHoyUsd: 0,
    cantidadDeudores: 0,
  });

  const cargarDatosCobranza = async () => {
    setCargando(true);
    try {
      const { data: cots, error } = await supabase
        .from('cotizaciones')
        .select(`*, clientes ( nombre, apellido, telefono, empresa )`)
        .order('created_at', { ascending: false });

      if (cots) {
        const filtradas = cots.filter((cot) => {
          const deuda = cot.total - (cot.monto_pagado || 0);
          const tieneDeuda = deuda > 0.05;
          const esVentaValida =
            cot.tipo_operacion === 'venta_directa' && tieneDeuda;
          const esCotAprobada =
            cot.tipo_operacion === 'cotizacion' &&
            cot.estado === 'aprobado' &&
            tieneDeuda;
          return esVentaValida || esCotAprobada;
        });

        setCuentas(filtradas);

        // Calcular Resumen para las Cards
        const hoy = new Date().toISOString().split('T')[0];
        const totalCalle = filtradas.reduce(
          (acc, curr) => acc + (curr.total - (curr.monto_pagado || 0)),
          0,
        );

        // Simulación de cobrado hoy (puedes ajustar esta query a pagos_registrados si prefieres)
        setResumen({
          totalCalle: totalCalle,
          cobradoHoyUsd: 0, // Aquí podrías hacer otra query a pagos_registrados si la necesitas
          cantidadDeudores: filtradas.length,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarDatosCobranza();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
              Panel de <span className="text-orange-600">Cobranza</span>
            </h1>
            <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">
              Gestión de cuentas por recuperar
            </p>
          </div>
        </header>

        {/* --- LAS CARDS QUE FALTABAN --- */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase opacity-60 flex items-center gap-2">
                <Clock size={12} /> Total en la Calle
              </p>
              <h3 className="text-3xl font-black mt-1">
                $
                {resumen.totalCalle.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </h3>
            </div>
            <TrendingUp className="absolute right-[-10px] bottom-[-10px] text-white/5 w-24 h-24" />
          </div>

          <div className="bg-orange-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-orange-100">
            <p className="text-[10px] font-black uppercase opacity-70 flex items-center gap-2">
              <Wallet size={12} /> Clientes Pendientes
            </p>
            <h3 className="text-3xl font-black mt-1">
              {resumen.cantidadDeudores}{' '}
              <span className="text-sm opacity-60 italic">Cuentas</span>
            </h3>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
              <Check size={12} className="text-emerald-500" /> Meta de Cobro
            </p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">
              100%{' '}
              <span className="text-sm text-slate-300 font-medium tracking-normal">
                Efectividad
              </span>
            </h3>
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

        {/* LISTA DE CARDS DE CLIENTES */}
        <div className="grid grid-cols-1 gap-4">
          {cuentas
            .filter((c) =>
              `${c.clientes?.nombre} ${c.clientes?.apellido} ${c.clientes?.empresa}`
                .toLowerCase()
                .includes(busqueda.toLowerCase()),
            )
            .map((cta) => (
              <div
                key={cta.id}
                className="bg-white rounded-[2.5rem] p-6 shadow-sm border-2 border-slate-50 hover:border-orange-200 transition-all group"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-4 rounded-[1.5rem] group-hover:bg-orange-100 transition-colors">
                      <Wallet
                        className="text-slate-400 group-hover:text-orange-600"
                        size={24}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[8px] px-2 py-0.5 rounded-full font-black text-white uppercase ${cta.tipo_operacion === 'venta_directa' ? 'bg-orange-500' : 'bg-blue-500'}`}
                        >
                          {cta.tipo_operacion.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-300 italic">
                          #{cta.id.toString().slice(-5)}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 italic uppercase leading-none">
                        {cta.clientes?.nombre} {cta.clientes?.apellido}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {cta.clientes?.empresa || 'Particular'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-red-400 uppercase italic">
                        Saldo Pendiente
                      </p>
                      <p className="text-2xl font-black text-red-600 tracking-tighter leading-none">
                        {cta.moneda === 'BS'
                          ? `Bs. ${((cta.total - (cta.monto_pagado || 0)) * (cta.tasa_bcv || 1)).toLocaleString('es-VE')}`
                          : `$${(cta.total - (cta.monto_pagado || 0)).toFixed(2)}`}
                      </p>
                    </div>

                    <button
                      onClick={() => setCotizacionSeleccionada(cta)}
                      className="p-4 bg-slate-900 text-white rounded-[1.5rem] hover:bg-orange-600 transition-all shadow-lg"
                    >
                      <ChevronDown size={20} />
                    </button>
                  </div>
                </div>

                {/* ACCIONES RÁPIDAS */}
                <div className="flex gap-2 mt-6 pt-6 border-t border-slate-50">
                  <button
                    onClick={() => setCotizacionSeleccionada(cta)}
                    className="flex-1 bg-slate-50 text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-900 hover:text-white transition-all"
                  >
                    Registrar Pago
                  </button>
                  <a
                    href={`https://wa.me/${cta.clientes?.telefono}`}
                    target="_blank"
                    className="flex items-center gap-2 px-6 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-600 transition-all"
                  >
                    <MessageCircle size={16} />
                    <span className="hidden md:inline">WhatsApp</span>
                  </a>
                </div>
              </div>
            ))}
        </div>

        {/* MODAL (Espacio para tu lógica de abono) */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            {/* Renderiza aquí el contenido del modal de abono que ya tenías */}
            <div className="bg-white w-full max-w-md rounded-[3rem] p-8 relative">
              <button
                onClick={() => setCotizacionSeleccionada(null)}
                className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
              <h2 className="text-2xl font-black uppercase italic italic mb-2">
                Cobrar Cuenta
              </h2>
              <p className="text-slate-400 text-xs font-bold mb-6 uppercase tracking-widest">
                Cliente: {cotizacionSeleccionada.clientes?.nombre}
              </p>

              {/* Aquí insertas el formulario de Bs / USD que tenías en la otra vista */}
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 mb-6">
                <p className="text-[10px] font-black text-red-400 uppercase">
                  Monto a Liquidar
                </p>
                <p className="text-3xl font-black text-red-600">
                  $
                  {(
                    cotizacionSeleccionada.total -
                    (cotizacionSeleccionada.monto_pagado || 0)
                  ).toFixed(2)}
                </p>
              </div>

              <button className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs shadow-xl">
                Confirmar Operación
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
