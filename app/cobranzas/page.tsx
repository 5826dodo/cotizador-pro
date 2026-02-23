'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { enviarNotificacionTelegram } from '../../lib/telegram';
import {
  X,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  Wallet,
  Clock,
  Check,
  Calendar,
  TrendingUp,
  ChevronDown,
  User,
  ShoppingCart,
  MessageCircle, // <--- Icono para WhatsApp
  Receipt, // <--- Icono para Abonos
} from 'lucide-react';

export default function HistorialPage() {
  // --- ESTADOS ---
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);
  const [mostrarAbonar, setMostrarAbonar] = useState(false);

  // NUEVO: Estado para abonos realizados
  const [abonosRealizados, setAbonosRealizados] = useState<any[]>([]);

  const [tasaDia, setTasaDia] = useState<number>(0);
  const [montoBsRecibido, setMontoBsRecibido] = useState<number>(0);
  const [montoUsdRecibido, setMontoUsdRecibido] = useState<number>(0);
  const [cajasHoy, setCajasHoy] = useState({ bs: 0, usd: 0 });

  // --- CARGA DE DATOS ---
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data: cots } = await supabase
        .from('cotizaciones')
        .select(`*, clientes (*)`)
        .order('created_at', { ascending: false });
      if (cots) setCotizaciones(cots);

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const { data: pagos } = await supabase
        .from('pagos_registrados')
        .select('monto_bs, monto_usd')
        .gte('created_at', hoy.toISOString());

      if (pagos) {
        const totales = pagos.reduce(
          (acc, p) => ({
            bs: acc.bs + Number(p.monto_bs || 0),
            usd: acc.usd + Number(p.monto_usd || 0),
          }),
          { bs: 0, usd: 0 },
        );
        setCajasHoy(totales);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
    setCargando(false);
  };

  // NUEVO: Cargar abonos específicos al seleccionar una cotización
  const cargarAbonos = async (id: string) => {
    const { data } = await supabase
      .from('pagos_registrados')
      .select('*')
      .eq('cotizacion_id', id)
      .order('created_at', { ascending: false });
    setAbonosRealizados(data || []);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // --- WHATSAPP LOGIC ---
  const enviarWhatsApp = () => {
    const cot = cotizacionSeleccionada;
    const saldo = cot.total - (cot.monto_pagado || 0);
    const productos = cot.productos_seleccionados
      ?.map((p: any) => `- ${p.cantidad}x ${p.nombre}`)
      .join('%0A');
    const historial = abonosRealizados
      .map(
        (a: any) =>
          `- ${new Date(a.created_at).toLocaleDateString()}: $${a.monto_usd} / Bs.${a.monto_bs} (Tasa: ${a.tasa_aplicada})`,
      )
      .join('%0A');

    const mensaje =
      `*ESTADO DE CUENTA - ${cot.clientes?.empresa || 'VENTIQ'}*%0A%0A` +
      `Hola *${cot.clientes?.nombre}*, este es el resumen de tu deuda:%0A%0A` +
      `*PRODUCTOS:*%0A${productos}%0A%0A` +
      `*ABONOS REALIZADOS:*%0A${historial || 'Sin abonos previos'}%0A%0A` +
      `*SALDO PENDIENTE: $${saldo.toFixed(2)}*%0A%0A` +
      `_Por favor confirmar el pago._`;

    window.open(
      `https://wa.me/${cot.clientes?.telefono}?text=${mensaje}`,
      '_blank',
    );
  };

  // --- LÓGICA: APROBAR ---
  const aprobarOperacion = async (cot: any) => {
    setProcesandoAccion(true);
    try {
      const productos = cot.productos_seleccionados || [];
      for (const item of productos) {
        const { data: p } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.id)
          .single();
        if (p)
          await supabase
            .from('productos')
            .update({ stock: p.stock - item.cantidad })
            .eq('id', item.id);
      }
      await supabase
        .from('cotizaciones')
        .update({
          estado: 'aprobado',
          fecha_aprobacion: new Date().toISOString(),
        })
        .eq('id', cot.id);
      alert('✅ Operación Aprobada');
      cargarDatos();
      setCotizacionSeleccionada(null);
    } catch (error) {
      alert('Error al aprobar');
    }
    setProcesandoAccion(false);
  };

  // --- LÓGICA: REGISTRAR PAGO ---
  const registrarPago = async (
    cot: any,
    usdEquivalente: number,
    tipo: string,
    montoBsOverride?: number,
    montoUsdOverride?: number,
  ) => {
    const deudaActualUsd = cot.total - (cot.monto_pagado || 0);
    const bsAFinal =
      montoBsOverride !== undefined ? montoBsOverride : montoBsRecibido;
    const usdAFinal =
      montoUsdOverride !== undefined ? montoUsdOverride : montoUsdRecibido;

    if (usdEquivalente > deudaActualUsd + 0.05) {
      alert(`⚠️ El monto excede la deuda actual`);
      return;
    }

    setProcesandoAccion(true);
    try {
      await supabase.from('pagos_registrados').insert([
        {
          cotizacion_id: cot.id,
          monto_bs: bsAFinal,
          monto_usd: usdAFinal,
          tasa_aplicada: tasaDia || cot.tasa_bcv,
          observacion: tipo,
        },
      ]);

      const nuevoTotalPagado = (cot.monto_pagado || 0) + usdEquivalente;
      await supabase
        .from('cotizaciones')
        .update({
          monto_pagado: nuevoTotalPagado,
          estado_pago:
            nuevoTotalPagado >= cot.total - 0.05 ? 'pagado' : 'parcial',
        })
        .eq('id', cot.id);

      alert('✅ Pago procesado');
      setMontoBsRecibido(0);
      setMontoUsdRecibido(0);
      setTasaDia(0);
      setCotizacionSeleccionada(null);
      setMostrarAbonar(false);
      await cargarDatos();
    } catch (error) {
      alert('Error al procesar pago');
    }
    setProcesandoAccion(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* SECCIÓN CAJAS (Mantenido igual) */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100">
            <p className="text-[10px] font-black uppercase opacity-70">
              Caja Bolívares Hoy
            </p>
            <h3 className="text-3xl font-black">
              Bs. {cajasHoy.bs.toLocaleString('es-VE')}
            </h3>
          </div>
          <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl shadow-slate-200">
            <p className="text-[10px] font-black uppercase opacity-70">
              Caja Dólares Hoy
            </p>
            <h3 className="text-3xl font-black">
              ${cajasHoy.usd.toLocaleString()}
            </h3>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-orange-100">
            <p className="text-[10px] font-black text-slate-400 uppercase">
              Por Cobrar
            </p>
            <h3 className="text-3xl font-black text-red-600">
              $
              {cotizaciones
                .filter((c) => c.estado === 'aprobado')
                .reduce(
                  (acc, curr) => acc + (curr.total - (curr.monto_pagado || 0)),
                  0,
                )
                .toFixed(2)}
            </h3>
          </div>
        </section>

        <input
          type="text"
          placeholder="Buscar cliente..."
          className="w-full p-4 mb-8 rounded-2xl border-none ring-2 ring-slate-100 focus:ring-emerald-500 font-bold outline-none shadow-sm transition-all"
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {/* LISTADO DE REGISTROS */}
        <div className="space-y-4">
          {cotizaciones
            .filter((c) =>
              c.clientes?.nombre
                ?.toLowerCase()
                .includes(busqueda.toLowerCase()),
            )
            .map((cot) => {
              const deudaUsd = cot.total - (cot.monto_pagado || 0);
              return (
                <div
                  key={cot.id}
                  className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-slate-50 hover:border-orange-100 transition-all mb-4"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-900 p-4 rounded-[1.5rem] shadow-lg shadow-slate-200">
                        <User className="text-orange-500" size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          Cliente
                        </p>
                        <h3 className="text-xl font-black text-slate-800 italic uppercase tracking-tighter">
                          {cot.clientes?.nombre} {cot.clientes?.apellido}
                        </h3>
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                            ID: {cot.clientes?.cedula || 'N/A'}
                          </span>
                          <span className="text-[10px] font-black text-orange-600/70 italic">
                            {new Date(cot.created_at).toLocaleDateString(
                              'es-VE',
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:flex md:items-center gap-8 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                      <div className="text-left md:text-right">
                        <span
                          className={`text-[8px] px-2 py-0.5 rounded-full font-black text-white uppercase mb-1 inline-block ${cot.tipo_operacion === 'venta_directa' ? 'bg-orange-600' : 'bg-blue-600'}`}
                        >
                          {cot.tipo_operacion === 'venta_directa'
                            ? 'Venta'
                            : 'Cotización'}
                        </span>
                        <p className="text-[9px] font-black text-slate-400 uppercase italic">
                          Total
                        </p>
                        <p className="font-black text-lg text-slate-900">
                          ${cot.total.toFixed(2)}
                        </p>
                      </div>

                      <div className="text-right border-l-2 border-orange-100 pl-6">
                        <p className="text-[9px] font-black text-red-400 uppercase italic">
                          Saldo
                        </p>
                        <p
                          className={`font-black text-2xl leading-none tracking-tighter ${deudaUsd <= 0 ? 'text-emerald-500' : 'text-red-600 animate-pulse'}`}
                        >
                          {deudaUsd <= 0
                            ? 'SOLVENTE'
                            : `$${deudaUsd.toFixed(2)}`}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setCotizacionSeleccionada(cot);
                          cargarAbonos(cot.id); // <--- Carga los abonos al abrir
                        }}
                        className="col-span-2 md:col-span-1 p-4 bg-slate-900 text-white rounded-[1.5rem] hover:bg-orange-600 transition-all flex justify-center items-center shadow-xl shadow-slate-200"
                      >
                        <Eye size={22} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* MODAL DE GESTIÓN (REDISEÑADO CON WHATSAPP Y ABONOS) */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
              {/* CABECERA CON BOTÓN WHATSAPP */}
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center border-b-4 border-orange-600">
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">
                    Gestión de Cobro
                  </h3>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={enviarWhatsApp}
                      className="flex items-center gap-1 bg-emerald-500 text-[9px] font-black px-3 py-1 rounded-full hover:bg-emerald-600 transition-colors"
                    >
                      <MessageCircle size={12} /> WHATSAPP
                    </button>
                    <span className="text-[9px] font-black bg-orange-600 text-white px-2 py-1 rounded-full uppercase">
                      {cotizacionSeleccionada.clientes?.empresa}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setCotizacionSeleccionada(null)}
                  className="p-3 bg-white/10 rounded-2xl hover:bg-red-500 transition-all text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scroll">
                {/* DETALLE PRODUCTOS */}
                <div className="bg-slate-50 rounded-[2rem] p-5 border-2 border-slate-100">
                  <details className="group">
                    <summary className="list-none flex justify-between items-center cursor-pointer">
                      <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase italic tracking-widest">
                        <ShoppingCart size={14} /> Productos Comprados
                      </div>
                      <ChevronDown
                        size={14}
                        className="group-open:rotate-180 transition-transform"
                      />
                    </summary>
                    <div className="mt-4 space-y-2">
                      {cotizacionSeleccionada.productos_seleccionados?.map(
                        (item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center bg-white p-3 rounded-[1rem] shadow-sm border border-slate-100 text-[11px] font-black italic uppercase"
                          >
                            <span>
                              {item.cantidad} x {item.nombre}
                            </span>
                            <span>
                              ${(item.precio * item.cantidad).toFixed(2)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </details>
                </div>

                {/* NUEVO: HISTORIAL DE ABONOS DENTRO DEL MODAL */}
                <div className="bg-blue-50/50 rounded-[2rem] p-5 border-2 border-blue-100">
                  <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase mb-4 tracking-widest">
                    <Receipt size={14} /> Historial de Abonos
                  </div>
                  <div className="space-y-2">
                    {abonosRealizados.length > 0 ? (
                      abonosRealizados.map((abono, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-white/80 p-2 rounded-xl text-[10px] font-bold border border-blue-100"
                        >
                          <span className="text-slate-500">
                            {new Date(abono.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-blue-700 font-black">
                            ${abono.monto_usd} / Bs.{abono.monto_bs}
                          </span>
                          <span className="text-[8px] bg-blue-100 px-2 py-0.5 rounded-md text-blue-500">
                            T: {abono.tasa_aplicada}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 font-bold text-center py-2">
                        NO HAY ABONOS REGISTRADOS
                      </p>
                    )}
                  </div>
                </div>

                {/* INTERFAZ DE COBRO Y PAGO (Tu lógica original intacta) */}
                {cotizacionSeleccionada.estado === 'pendiente' ? (
                  <div className="p-8 bg-amber-50 rounded-[2.5rem] border-2 border-dashed border-amber-200 text-center">
                    <AlertCircle
                      className="mx-auto mb-3 text-amber-500"
                      size={32}
                    />
                    <p className="text-sm font-black text-amber-800 uppercase mb-4 italic">
                      Aprobación requerida para cobros
                    </p>
                    <button
                      onClick={() => aprobarOperacion(cotizacionSeleccionada)}
                      className="w-full bg-amber-500 text-white p-5 rounded-[1.5rem] font-black uppercase text-xs shadow-xl hover:scale-[1.02] transition-transform"
                    >
                      Aprobar Ahora
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                        <p className="text-[9px] font-black text-emerald-400 uppercase italic mb-1 tracking-tighter">
                          Total Abonado
                        </p>
                        <p className="text-lg font-black text-emerald-700">
                          $
                          {(cotizacionSeleccionada.monto_pagado || 0).toFixed(
                            2,
                          )}
                        </p>
                      </div>
                      <div className="p-5 bg-red-50 rounded-[2rem] border border-red-100 shadow-sm">
                        <p className="text-[9px] font-black text-red-400 uppercase italic mb-1 tracking-tighter">
                          Deuda Pendiente
                        </p>
                        <p className="text-lg font-black text-red-600">
                          $
                          {(
                            cotizacionSeleccionada.total -
                            (cotizacionSeleccionada.monto_pagado || 0)
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* SECCIÓN DE ABONOS MANUALES (Tu lógica original) */}
                    {cotizacionSeleccionada.total -
                      (cotizacionSeleccionada.monto_pagado || 0) >
                      0.05 && (
                      <div className="space-y-4">
                        <button
                          onClick={() => setMostrarAbonar(!mostrarAbonar)}
                          className="w-full bg-slate-900 text-white p-5 rounded-[1.5rem] font-black uppercase text-xs flex justify-center items-center gap-3"
                        >
                          {mostrarAbonar
                            ? 'Cerrar Registro'
                            : 'Registrar Pago / Abono'}
                          <ChevronDown
                            size={18}
                            className={`transition-transform ${mostrarAbonar ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {mostrarAbonar && (
                          <div className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 space-y-4">
                            {(() => {
                              const deudaPendienteUsd =
                                cotizacionSeleccionada.total -
                                (cotizacionSeleccionada.monto_pagado || 0);
                              const tasaParaCalculo =
                                tasaDia > 0
                                  ? tasaDia
                                  : cotizacionSeleccionada.tasa_bcv || 1;
                              const deudaEnBs = (
                                deudaPendienteUsd * tasaParaCalculo
                              ).toFixed(2);

                              return (
                                <>
                                  <div className="relative">
                                    <label className="text-[9px] font-black uppercase text-slate-400 absolute -top-2 left-4 bg-white px-2 z-10">
                                      Tasa del Día
                                    </label>
                                    <input
                                      type="number"
                                      className="w-full p-4 rounded-[1.2rem] border-2 border-slate-200 font-black"
                                      placeholder="Ej: 54.50"
                                      value={tasaDia || ''}
                                      onChange={(e) =>
                                        setTasaDia(
                                          parseFloat(e.target.value) || 0,
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <span className="text-[8px] font-bold text-emerald-500 ml-2 italic">
                                        Abonar Bs.
                                      </span>
                                      <input
                                        type="number"
                                        value={montoBsRecibido || ''}
                                        className="w-full p-4 rounded-[1.2rem] border-2 border-emerald-100 font-black text-emerald-600"
                                        placeholder={`Bs. ${deudaEnBs}`}
                                        onChange={(e) =>
                                          setMontoBsRecibido(
                                            parseFloat(e.target.value) || 0,
                                          )
                                        }
                                      />
                                    </div>
                                    <div>
                                      <span className="text-[8px] font-bold text-blue-500 ml-2 italic">
                                        Abonar USD
                                      </span>
                                      <input
                                        type="number"
                                        value={montoUsdRecibido || ''}
                                        className="w-full p-4 rounded-[1.2rem] border-2 border-blue-100 font-black text-blue-600"
                                        placeholder={`$${deudaPendienteUsd.toFixed(2)}`}
                                        onChange={(e) =>
                                          setMontoUsdRecibido(
                                            parseFloat(e.target.value) || 0,
                                          )
                                        }
                                      />
                                    </div>
                                  </div>
                                  <button
                                    disabled={
                                      montoBsRecibido <= 0 &&
                                      montoUsdRecibido <= 0
                                    }
                                    onClick={() =>
                                      registrarPago(
                                        cotizacionSeleccionada,
                                        montoUsdRecibido +
                                          montoBsRecibido / tasaParaCalculo,
                                        'Abono Parcial',
                                      )
                                    }
                                    className={`w-full p-5 rounded-[1.5rem] font-black uppercase text-xs ${montoBsRecibido > 0 || montoUsdRecibido > 0 ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}
                                  >
                                    Confirmar Abono
                                  </button>

                                  {/* BOTONES LIQUIDAR TODO (Tu lógica original) */}
                                  <div className="grid grid-cols-2 gap-3 mt-4">
                                    <button
                                      onClick={() =>
                                        registrarPago(
                                          cotizacionSeleccionada,
                                          deudaPendienteUsd,
                                          'Total en Bs',
                                          Number(deudaEnBs),
                                          0,
                                        )
                                      }
                                      className="bg-white border-2 border-emerald-500 text-emerald-600 p-4 rounded-2xl font-black text-[10px]"
                                    >
                                      PAGAR TODO BS
                                    </button>
                                    <button
                                      onClick={() =>
                                        registrarPago(
                                          cotizacionSeleccionada,
                                          deudaPendienteUsd,
                                          'Total en USD',
                                          0,
                                          deudaPendienteUsd,
                                        )
                                      }
                                      className="bg-slate-900 text-white p-4 rounded-2xl font-black text-[10px]"
                                    >
                                      PAGAR TODO $
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
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
