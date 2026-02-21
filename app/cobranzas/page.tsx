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
  X,
} from 'lucide-react';

export default function CobranzasPage() {
  const [deudas, setDeudas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [deudaSeleccionada, setDeudaSeleccionada] = useState<any | null>(null);
  const [mostrarRecibos, setMostrarRecibos] = useState(false);

  const cargarCuentasPorCobrar = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('cotizaciones')
      .select(
        `
      *,
      clientes ( nombre, telefono, empresa ),
      pagos ( id, monto, fecha, metodo_pago, nota ) 
    `,
      ) // Traemos la relación de pagos
      .eq('tipo_operacion', 'venta_directa')
      .order('created_at', { ascending: false });

    if (data) {
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
                      onClick={() => setDeudaSeleccionada(deuda)}
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
      {/* MODAL DE DETALLES Y RECIBOS */}
      {deudaSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">
                    Estado de Cuenta
                  </h2>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                    Cliente: {deudaSeleccionada.clientes?.nombre}
                  </p>
                </div>
                <button
                  onClick={() => setDeudaSeleccionada(null)}
                  className="bg-slate-100 p-2 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* RESUMEN RÁPIDO DENTRO DEL MODAL */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Total
                  </p>
                  <p className="text-lg font-bold text-slate-800">
                    ${deudaSeleccionada.total}
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-400 uppercase">
                    Pagado
                  </p>
                  <p className="text-lg font-bold text-emerald-600">
                    ${deudaSeleccionada.monto_pagado || 0}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                  <p className="text-[10px] font-black text-red-400 uppercase">
                    Pendiente
                  </p>
                  <p className="text-lg font-bold text-red-600">
                    $
                    {deudaSeleccionada.total -
                      (deudaSeleccionada.monto_pagado || 0)}
                  </p>
                </div>
              </div>

              {/* LISTA DE PAGOS REALIZADOS (LOS RECIBOS) */}
              <div className="space-y-3">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                  <ArrowRightCircle size={16} className="text-red-500" />{' '}
                  Historial de Abonos
                </h3>
                <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                  {deudaSeleccionada.pagos &&
                  deudaSeleccionada.pagos.length > 0 ? (
                    deudaSeleccionada.pagos.map((pago: any) => (
                      <div
                        key={pago.id}
                        className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-300 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-2 rounded-xl shadow-sm">
                            <Calendar size={18} className="text-slate-400" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 text-sm">
                              {new Date(pago.fecha).toLocaleDateString()}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              {pago.metodo_pago}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-600">
                            +${pago.monto.toLocaleString()}
                          </p>
                          <p className="text-[9px] text-slate-400 italic">
                            {pago.nota || 'Sin nota'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-slate-400 text-sm font-bold italic">
                      No se han registrado abonos aún.
                    </p>
                  )}
                </div>
              </div>

              {/* BOTÓN DE ACCIÓN */}
              <button className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 group">
                Registrar Nuevo Pago
                <DollarSign
                  size={20}
                  className="group-hover:scale-125 transition-transform"
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
