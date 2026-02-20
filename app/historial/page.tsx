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
  ChevronDown,
} from 'lucide-react';

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState<any>(null);

  const [mostrarAbonar, setMostrarAbonar] = useState(false);
  const [tasaDia, setTasaDia] = useState<number>(0);
  const [montoBsRecibido, setMontoBsRecibido] = useState<number>(0);
  const [montoUsdRecibido, setMontoUsdRecibido] = useState<number>(0);
  const [observacion, setObservacion] = useState('');

  // Estado para el cierre de caja del día
  const [cajasHoy, setCajasHoy] = useState({ bs: 0, usd: 0 });

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // 1. Cargar Cotizaciones y Ventas
      const { data: cots } = await supabase
        .from('cotizaciones')
        .select(`*, clientes ( nombre, empresa )`)
        .order('created_at', { ascending: false });
      if (cots) setCotizaciones(cots);

      // 2. Cargar Pagos del día para las cajas (Cierre de caja)
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

  useEffect(() => {
    cargarDatos();
  }, []);

  // --- ACCIÓN 1: APROBAR Y DESCONTAR INVENTARIO ---
  const aprobarOperacion = async (cot: any) => {
    setProcesandoAccion(true);
    try {
      // 1. Descuento de Inventario desde JSONB
      const productos = cot.productos_seleccionados || [];

      for (const item of productos) {
        const { data: prodActual } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.id)
          .single();

        if (prodActual) {
          await supabase
            .from('productos')
            .update({ stock: prodActual.stock - item.cantidad })
            .eq('id', item.id);
        }
      }

      // 2. Cambiar estado a aprobado
      const { error } = await supabase
        .from('cotizaciones')
        .update({
          estado: 'aprobado',
          fecha_aprobacion: new Date().toISOString(),
        })
        .eq('id', cot.id);

      if (!error) {
        alert('Operación aprobada e inventario actualizado');
        cargarDatos();
        setCotizacionSeleccionada(null);
      }
    } catch (error) {
      console.error(error);
      alert('Error al procesar inventario');
    }
    setProcesandoAccion(false);
  };

  // --- ACCIÓN 2: REGISTRAR PAGO (SUMA A CAJAS) ---
  const registrarPago = async (
    cot: any,
    usdADescontar: number,
    tipo: string,
  ) => {
    if (usdADescontar <= 0 && montoBsRecibido <= 0 && montoUsdRecibido <= 0)
      return;

    setProcesandoAccion(true);
    try {
      // 1. Insertar en tabla de pagos (Caja del día)
      const { error: errorPago } = await supabase
        .from('pagos_registrados')
        .insert([
          {
            cotizacion_id: cot.id,
            monto_bs: montoBsRecibido,
            monto_usd: montoUsdRecibido,
            tasa_aplicada: tasaDia || cot.tasa_bcv,
            observacion: observacion || tipo,
          },
        ]);

      if (errorPago) throw errorPago;

      // 2. Actualizar saldo en cotización
      const nuevoTotalPagado = (cot.monto_pagado || 0) + usdADescontar;
      await supabase
        .from('cotizaciones')
        .update({
          monto_pagado: nuevoTotalPagado,
          ultima_tasa_pago: tasaDia > 0 ? tasaDia : cot.tasa_bcv,
          estado_pago:
            nuevoTotalPagado >= cot.total - 0.01 ? 'pagado' : 'parcial',
        })
        .eq('id', cot.id);

      // 3. Notificación Telegram
      const mensaje = `💰 *NUEVO PAGO*\n👤 *Cliente:* ${cot.clientes?.nombre}\n💵 *Recibido:* $${usdADescontar.toFixed(2)}\n🏦 *Caja Bs:* ${montoBsRecibido}\n💵 *Caja USD:* ${montoUsdRecibido}\n📝 *Nota:* ${observacion || 'Sin nota'}`;
      await enviarNotificacionTelegram(mensaje);

      // Reset y recarga
      setMostrarAbonar(false);
      setMontoBsRecibido(0);
      setMontoUsdRecibido(0);
      setCotizacionSeleccionada(null);
      cargarDatos();
    } catch (error) {
      alert('Error al registrar pago');
    }
    setProcesandoAccion(false);
  };

  const historialFiltrado = cotizaciones.filter((cot) => {
    const term = busqueda.toLowerCase();
    const coincideNombre = cot.clientes?.nombre?.toLowerCase().includes(term);
    const fechaCot = cot.created_at.split('T')[0];
    return coincideNombre && (filtroFecha === '' || fechaCot === filtroFecha);
  });

  if (cargando)
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-orange-600" size={40} />
      </div>
    );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* RESUMEN DE CAJAS (CIERRE DEL DÍA) */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-lg">
            <p className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1">
              <Clock size={12} /> Caja Bs (Entradas Hoy)
            </p>
            <h3 className="text-3xl font-black">
              Bs. {cajasHoy.bs.toLocaleString('es-VE')}
            </h3>
            <p className="text-[8px] opacity-50 font-bold uppercase mt-1">
              Efectivo y transferencias en Bs
            </p>
          </div>

          <div className="bg-orange-600 p-6 rounded-[2rem] text-white shadow-lg">
            <p className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1">
              <Clock size={12} /> Caja USD (Entradas Hoy)
            </p>
            <h3 className="text-3xl font-black">
              ${cajasHoy.usd.toLocaleString()}
            </h3>
            <p className="text-[8px] opacity-50 font-bold uppercase mt-1">
              Dólares físicos / Zelle
            </p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-orange-100">
            <p className="text-[10px] font-black text-slate-400 uppercase">
              Cuentas por Cobrar Total
            </p>
            <h3 className="text-3xl font-black text-red-600">
              $
              {cotizaciones
                .reduce(
                  (acc, curr) => acc + (curr.total - (curr.monto_pagado || 0)),
                  0,
                )
                .toLocaleString()}
            </h3>
          </div>
        </section>

        {/* BUSCADOR */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por cliente..."
            className="w-full p-4 rounded-2xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* LISTADO DE COTIZACIONES / VENTAS */}
        <div className="space-y-3">
          {historialFiltrado.map((cot) => {
            const esBS = cot.moneda === 'BS';
            const deudaUsd = cot.total - (cot.monto_pagado || 0);
            const estaPagado = deudaUsd <= 0.05;

            return (
              <div
                key={cot.id}
                className="bg-white p-5 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between shadow-sm gap-4"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className={`p-4 rounded-2xl ${estaPagado ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-400'}`}
                  >
                    {esBS ? <Wallet size={20} /> : <DollarSign size={20} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-xs">
                      {cot.clientes?.nombre}
                    </h4>
                    <div className="flex gap-2 items-center">
                      <span
                        className={`text-[8px] font-black px-2 py-0.5 rounded mt-1 inline-block ${cot.tipo_operacion === 'venta_directa' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}
                      >
                        {cot.tipo_operacion === 'venta_directa'
                          ? 'VENTA'
                          : 'COTIZACIÓN'}
                      </span>
                      <span
                        className={`text-[8px] font-black px-2 py-0.5 rounded mt-1 inline-block ${cot.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {cot.estado?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Monto Total
                    </p>
                    <p className="font-black text-slate-800 text-sm">
                      {esBS
                        ? `Bs. ${(cot.total * cot.tasa_bcv).toLocaleString('es-VE')}`
                        : `$${cot.total}`}
                    </p>
                  </div>
                  <div className="text-right border-l pl-6">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic">
                      Deuda actual
                    </p>
                    <p
                      className={`font-black text-sm ${estaPagado ? 'text-emerald-500' : 'text-red-600'}`}
                    >
                      {estaPagado ? 'PAGADO' : `$${deudaUsd.toFixed(2)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setCotizacionSeleccionada(cot)}
                    className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-700 transition-colors"
                  >
                    <Eye size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL DE GESTIÓN */}
        {cotizacionSeleccionada && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] max-h-[95vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-lg font-black uppercase text-slate-800">
                    Gestionar Operación
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {cotizacionSeleccionada.clientes?.nombre}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCotizacionSeleccionada(null);
                    setMostrarAbonar(false);
                  }}
                  className="p-2 bg-slate-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* SI ESTÁ PENDIENTE (APROBAR + DESCONTAR STOCK) */}
                {cotizacionSeleccionada.estado === 'pendiente' ? (
                  <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200 text-center">
                    <AlertCircle className="mx-auto mb-2 text-amber-500" />
                    <p className="text-xs font-bold text-amber-800 mb-4">
                      Esta{' '}
                      {cotizacionSeleccionada.tipo_operacion.replace('_', ' ')}{' '}
                      aún no ha descontado stock.
                    </p>
                    <button
                      onClick={() => aprobarOperacion(cotizacionSeleccionada)}
                      disabled={procesandoAccion}
                      className="w-full bg-orange-600 text-white p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"
                    >
                      {procesandoAccion ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        'Aprobar y Descontar Inventario'
                      )}
                    </button>
                  </div>
                ) : (
                  /* SI YA ESTÁ APROBADA (GESTIONAR PAGOS) */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase">
                          Pagado
                        </p>
                        <p className="text-sm font-black text-emerald-600">
                          ${cotizacionSeleccionada.monto_pagado || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase">
                          Deuda
                        </p>
                        <p className="text-sm font-black text-red-600">
                          $
                          {(
                            cotizacionSeleccionada.total -
                            (cotizacionSeleccionada.monto_pagado || 0)
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setMostrarAbonar(!mostrarAbonar)}
                      className="w-full bg-slate-100 text-slate-600 p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"
                    >
                      {mostrarAbonar ? 'Cerrar' : 'Registrar Pago / Abono'}
                      <ChevronDown
                        size={16}
                        className={mostrarAbonar ? 'rotate-180' : ''}
                      />
                    </button>

                    {mostrarAbonar && (
                      <div className="space-y-4 p-4 bg-slate-50 rounded-3xl border border-slate-200">
                        <input
                          type="number"
                          placeholder="Tasa de Cambio (Hoy)"
                          className="w-full p-3 rounded-xl border-none ring-1 ring-slate-200 font-black text-sm"
                          onChange={(e) =>
                            setTasaDia(parseFloat(e.target.value) || 0)
                          }
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            placeholder="Monto Bs"
                            className="p-3 rounded-xl border-none ring-1 ring-emerald-100 font-black text-emerald-600"
                            onChange={(e) =>
                              setMontoBsRecibido(
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                          <input
                            type="number"
                            placeholder="Monto USD $"
                            className="p-3 rounded-xl border-none ring-1 ring-orange-100 font-black text-orange-600"
                            onChange={(e) =>
                              setMontoUsdRecibido(
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </div>

                        <div className="p-3 bg-slate-900 rounded-xl text-white flex justify-between items-center">
                          <span className="text-[10px] opacity-60 uppercase font-bold">
                            Se descuenta de deuda:
                          </span>
                          <span className="text-lg font-black text-emerald-400">
                            $
                            {(
                              montoUsdRecibido +
                              montoBsRecibido /
                                (tasaDia || cotizacionSeleccionada.tasa_bcv)
                            ).toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={() =>
                            registrarPago(
                              cotizacionSeleccionada,
                              montoUsdRecibido +
                                montoBsRecibido /
                                  (tasaDia || cotizacionSeleccionada.tasa_bcv),
                              'Abono',
                            )
                          }
                          disabled={
                            procesandoAccion ||
                            (montoBsRecibido <= 0 && montoUsdRecibido <= 0)
                          }
                          className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-black uppercase text-xs shadow-lg"
                        >
                          {procesandoAccion
                            ? 'Procesando...'
                            : 'Confirmar Cobro y Sumar a Caja'}
                        </button>
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
