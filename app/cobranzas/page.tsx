'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  DollarSign,
  Search,
  Calendar,
  ArrowRightCircle,
  Loader2,
  CheckCircle2,
  CircleDollarSign,
  MessageCircle,
  X,
  Package,
  Receipt,
} from 'lucide-react';

export default function CobranzasPage() {
  const [deudas, setDeudas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Estados para el Modal de Detalle
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<any>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [abonos, setAbonos] = useState<any[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargarCuentasPorCobrar = async () => {
    setCargando(true);
    const { data } = await supabase
      .from('cotizaciones')
      .select(`*, clientes (*)`)
      .order('created_at', { ascending: false });

    if (data) {
      const pendientes = data.filter((c) => {
        const saldo = Number(c.total) - Number(c.monto_pagado || 0);
        const tieneDeuda = saldo > 0.1;
        return (
          (c.tipo_operacion === 'venta_directa' ||
            (c.tipo_operacion === 'cotizacion' && c.estado === 'aprobado')) &&
          tieneDeuda
        );
      });
      setDeudas(pendientes);
    }
    setCargando(false);
  };

  // Función para abrir modal y cargar info extra
  const verDetalleCobro = async (cotizacion: any) => {
    setDetalleSeleccionado(cotizacion);
    setCargandoDetalle(true);

    // 1. Cargar Productos
    const { data: items } = await supabase
      .from('items_cotizacion')
      .select('*')
      .eq('cotizacion_id', cotizacion.id);

    // 2. Cargar Abonos (Asumiendo que tienes una tabla llamada 'pagos_registrados')
    const { data: pagos } = await supabase
      .from('pagos_registrados')
      .select('*')
      .eq('cotizacion_id', cotizacion.id);

    setProductos(items || []);
    setAbonos(pagos || []);
    setCargandoDetalle(false);
  };

  const enviarRecordatorioWhatsApp = () => {
    if (!detalleSeleccionado) return;

    const saldo =
      detalleSeleccionado.total - (detalleSeleccionado.monto_pagado || 0);
    const listaProductos = productos
      .map((p) => `- ${p.cantidad}x ${p.descripcion}`)
      .join('%0A');
    const listaAbonos = abonos
      .map(
        (a) =>
          `- ${new Date(a.fecha_pago).toLocaleDateString()}: $${a.monto} (Tasa: ${a.tasa_bcv})`,
      )
      .join('%0A');

    const mensaje =
      `*ESTADO DE CUENTA - ${detalleSeleccionado.clientes?.empresa || 'CLIENTE'}*%0A%0A` +
      `Hola *${detalleSeleccionado.clientes?.nombre}*, te enviamos el resumen de tu cuenta:%0A%0A` +
      `*DETALLE DE COMPRA:*%0A${listaProductos}%0A%0A` +
      `*HISTORIAL DE ABONOS:*%0A${listaAbonos || 'Sin abonos previos'}%0A%0A` +
      `*RESUMEN FINAL:*%0A` +
      `Total Venta: $${detalleSeleccionado.total.toLocaleString()}%0A` +
      `Total Abonado: $${(detalleSeleccionado.monto_pagado || 0).toLocaleString()}%0A` +
      `*SALDO PENDIENTE: $${saldo.toLocaleString()}*%0A%0A` +
      `Por favor, confirmar recepción.`;

    window.open(
      `https://wa.me/${detalleSeleccionado.clientes?.telefono}?text=${mensaje}`,
      '_blank',
    );
  };

  useEffect(() => {
    cargarCuentasPorCobrar();
  }, []);

  // ... (Filtros y totales iguales a tu código anterior)

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* ... Header y Buscador iguales ... */}

        <div className="grid gap-4">
          {deudas.map((deuda) => (
            <div
              key={deuda.id}
              className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 group"
            >
              {/* Info del Cliente (Igual a tu código anterior) */}
              <div className="flex items-center gap-5 flex-1">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black italic uppercase">
                  {deuda.clientes?.nombre?.substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase leading-none">
                    {deuda.clientes?.nombre}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">
                    {deuda.clientes?.empresa}
                  </p>
                </div>
              </div>

              {/* Montos */}
              <div className="flex items-center gap-4">
                <div className="bg-red-50 px-6 py-3 rounded-2xl border border-red-100 text-right">
                  <p className="text-[10px] font-black text-red-400 uppercase">
                    Pendiente
                  </p>
                  <p className="text-xl font-black text-red-600">
                    $
                    {(deuda.total - (deuda.monto_pagado || 0)).toLocaleString()}
                  </p>
                </div>

                {/* BOTÓN ACCIÓN */}
                <button
                  onClick={() => verDetalleCobro(deuda)}
                  className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-orange-600 transition-all shadow-lg"
                >
                  <ArrowRightCircle size={24} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL DE DETALLE Y COBRO */}
        {detalleSeleccionado && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="p-8 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">
                      Detalle de <span className="text-orange-600">Cuenta</span>
                    </h2>
                    <p className="text-slate-400 font-bold text-xs uppercase">
                      Cotización #{detalleSeleccionado.id.toString().slice(-5)}
                    </p>
                  </div>
                  <button
                    onClick={() => setDetalleSeleccionado(null)}
                    className="p-2 bg-slate-100 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Columna Izquierda: Productos */}
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 font-black text-xs uppercase text-slate-400">
                      <Package size={14} /> Productos Comprados
                    </h4>
                    <div className="bg-slate-50 rounded-3xl p-4 space-y-2">
                      {cargandoDetalle ? (
                        <p className="text-xs animate-pulse">
                          Cargando productos...
                        </p>
                      ) : (
                        productos.map((p, i) => (
                          <div
                            key={i}
                            className="flex justify-between text-xs font-bold border-b border-slate-200 pb-2 italic"
                          >
                            <span>
                              {p.cantidad}x {p.descripcion}
                            </span>
                            <span className="text-slate-400">
                              ${p.precio_unitario}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Columna Derecha: Historial Abonos */}
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 font-black text-xs uppercase text-slate-400">
                      <Receipt size={14} /> Historial de Abonos
                    </h4>
                    <div className="bg-emerald-50 rounded-3xl p-4 space-y-2">
                      {cargandoDetalle ? (
                        <p className="text-xs animate-pulse">
                          Cargando abonos...
                        </p>
                      ) : abonos.length > 0 ? (
                        abonos.map((a, i) => (
                          <div
                            key={i}
                            className="flex justify-between text-[10px] font-black text-emerald-700"
                          >
                            <span>
                              {new Date(a.fecha_pago).toLocaleDateString()}
                            </span>
                            <span>
                              ${a.monto} (T: {a.tasa_bcv})
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] font-bold text-emerald-400 uppercase text-center py-4">
                          Sin abonos registrados
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resumen Final en el Modal */}
                <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-50 text-orange-400">
                      Total a Pagar hoy
                    </p>
                    <h3 className="text-4xl font-black italic">
                      $
                      {(
                        detalleSeleccionado.total -
                        (detalleSeleccionado.monto_pagado || 0)
                      ).toLocaleString()}
                    </h3>
                  </div>
                  <button
                    onClick={enviarRecordatorioWhatsApp}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-black uppercase text-[10px] transition-all"
                  >
                    <MessageCircle size={20} />
                    Enviar Recordatorio
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
