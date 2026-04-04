'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Trash2,
  Plus,
  Minus,
  FileText,
  Search,
  DollarSign,
  ShoppingCart,
  ChevronUp,
  ChevronDown,
  X,
  Printer,
  Bell,
  CheckCircle2,
  UserPlus,
  Users,
  Clock,
  AlertCircle,
  Loader2,
  Package,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────
type TipoOperacion = 'cotizacion' | 'venta_directa';
type ModoOperacion = 'completo' | 'ticketera';

interface PedidoCatalogo {
  id: string;
  nombre_cliente: string;
  productos: any[];
  total: number;
  estado: 'pendiente' | 'procesado' | 'cancelado';
  created_at: string;
}

// ── imprimirTicket ────────────────────────────────────────────
function imprimirTicket({
  empresa,
  cliente,
  items,
  total,
  tasaBCV,
  etiquetaMoneda,
  monedaPrincipal,
  estadoPago,
  montoPagado,
  observaciones,
}: {
  empresa: any;
  cliente: any | null;
  items: any[];
  total: number;
  tasaBCV: number;
  etiquetaMoneda: string;
  monedaPrincipal: 'USD' | 'BS';
  estadoPago: string;
  montoPagado: number;
  observaciones: string;
}) {
  const simbolo =
    monedaPrincipal === 'BS' ? 'Bs.' : etiquetaMoneda === 'EUR' ? '€' : '$';
  const factor = monedaPrincipal === 'BS' ? tasaBCV : 1;
  const totalEnMoneda = total * factor;
  const deuda = totalEnMoneda - montoPagado;
  const fechaHora = new Date().toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const numeroRecibo = Math.floor(Date.now() / 10000);

  const lineasProductos = items
    .map(
      (i) => `
    <tr>
      <td style="padding:3px 2px;border-bottom:1px dashed #ccc;">
        <div style="font-weight:700;font-size:11px;">${i.nombre.toUpperCase()}</div>
        <div style="font-size:10px;color:#555;">${i.cantidad} ${i.unidad_medida || 'UNID.'} x ${simbolo}${(i.precio * factor).toFixed(2)}</div>
      </td>
      <td style="padding:3px 2px;border-bottom:1px dashed #ccc;text-align:right;font-weight:700;font-size:11px;white-space:nowrap;">
        ${simbolo}${(i.precio * i.cantidad * factor).toFixed(2)}
      </td>
    </tr>`,
    )
    .join('');

  const estadoTexto =
    estadoPago === 'pagado'
      ? 'PAGADO'
      : estadoPago === 'pago_parcial'
        ? 'ABONO'
        : 'PENDIENTE';
  const selloClase =
    estadoPago === 'pagado'
      ? 'pagado'
      : estadoPago === 'pago_parcial'
        ? 'abono'
        : 'pendiente';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>Recibo #${numeroRecibo}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Courier New',monospace; width:72mm; font-size:11px; color:#111; background:#fff; }
    .center { text-align:center; } .right { text-align:right; } .bold { font-weight:700; }
    .div-solid { border-top:1px solid #111; margin:5px 0; }
    .div-dash  { border-top:1px dashed #aaa; margin:5px 0; }
    .emp-nombre { font-size:15px; font-weight:900; text-transform:uppercase; letter-spacing:1px; }
    table { width:100%; border-collapse:collapse; }
    .total-row td { font-size:14px; font-weight:900; padding:4px 2px; }
    .sello { display:inline-block; border:2px solid; border-radius:4px; padding:3px 10px; font-size:13px; font-weight:900; letter-spacing:2px; text-transform:uppercase; margin-top:4px; }
    .pagado   { border-color:#16a34a; color:#16a34a; }
    .abono    { border-color:#ca8a04; color:#ca8a04; }
    .pendiente{ border-color:#dc2626; color:#dc2626; }
    .footer { font-size:9px; color:#666; text-align:center; margin-top:8px; }
    @media print { body { width:72mm; } }
  </style></head><body>
  <div class="center" style="padding:4px 0 2px;">
    <div class="emp-nombre">${empresa?.nombre || 'MI EMPRESA'}</div>
    ${empresa?.rif ? `<div style="font-size:10px;">RIF: ${empresa.rif}</div>` : ''}
    ${empresa?.telefono ? `<div style="font-size:10px;">Telf: ${empresa.telefono}</div>` : ''}
    ${empresa?.direccion ? `<div style="font-size:9px;color:#555;">${empresa.direccion}</div>` : ''}
  </div>
  <div class="div-solid"></div>
  <div class="center">
    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">RECIBO DE VENTA</div>
    <div style="font-size:10px;">N° ${numeroRecibo}</div>
    <div style="font-size:10px;">${fechaHora}</div>
  </div>
  <div class="div-dash"></div>
  <div style="font-size:10px;margin-bottom:4px;">
    <span class="bold">CLIENTE: </span>
    ${cliente ? `${cliente.nombre?.toUpperCase()}${cliente.apellido ? ' ' + cliente.apellido.toUpperCase() : ''}` : 'CONSUMIDOR FINAL'}
    ${cliente?.cedula ? `<br/><span class="bold">CI/RIF: </span>${cliente.cedula}` : ''}
  </div>
  <div class="div-dash"></div>
  <table><tbody>${lineasProductos}</tbody></table>
  <div class="div-solid"></div>
  <table>
    <tr class="total-row">
      <td class="bold">TOTAL</td>
      <td class="right bold">${simbolo} ${totalEnMoneda.toFixed(2)}</td>
    </tr>
    ${
      monedaPrincipal === 'USD' && tasaBCV > 0
        ? `
    <tr>
      <td style="font-size:10px;color:#555;">Equivale Bs.</td>
      <td class="right" style="font-size:10px;color:#555;">${(total * tasaBCV).toFixed(2)}</td>
    </tr>`
        : ''
    }
    ${
      estadoPago === 'pago_parcial'
        ? `
    <tr>
      <td style="font-size:10px;">Recibido</td>
      <td class="right" style="font-size:10px;">${simbolo} ${montoPagado.toFixed(2)}</td>
    </tr>
    <tr>
      <td style="font-size:11px;font-weight:700;color:#dc2626;">RESTA</td>
      <td class="right" style="font-size:11px;font-weight:700;color:#dc2626;">${simbolo} ${deuda.toFixed(2)}</td>
    </tr>`
        : ''
    }
  </table>
  <div style="margin:6px 0;"><span class="sello ${selloClase}">${estadoTexto}</span></div>
  ${observaciones ? `<div class="div-dash"></div><div style="font-size:9px;color:#555;"><span class="bold">NOTAS: </span>${observaciones}</div>` : ''}
  <div class="div-dash"></div>
  <div class="footer"><div>¡Gracias por su compra!</div><div style="margin-top:2px;">${empresa?.nombre || ''}</div></div>
  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
  </body></html>`;

  const ventana = window.open('', '_blank', 'width=320,height=600');
  if (ventana) {
    ventana.document.write(html);
    ventana.document.close();
  }
}

// ── Panel de pedidos del catálogo ────────────────────────────
function PanelPedidosCatalogo({
  pedidos,
  clientes,
  cargandoPedidos,
  onCargarPedido,
  onCancelarPedido,
}: {
  pedidos: PedidoCatalogo[];
  clientes: any[];
  cargandoPedidos: boolean;
  onCargarPedido: (
    pedido: PedidoCatalogo,
    clienteId: string | null,
    nombreLibre: string,
  ) => void;
  onCancelarPedido: (id: string) => void;
}) {
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null);
  // Para cada pedido pendiente, el usuario puede vincular un cliente existente o dejarlo como nombre libre
  const [vinculaciones, setVinculaciones] = useState<
    Record<string, { clienteId: string; busqueda: string }>
  >({});

  const getVinculacion = (id: string) =>
    vinculaciones[id] || { clienteId: '', busqueda: '' };

  const setVinculacion = (
    id: string,
    data: { clienteId: string; busqueda: string },
  ) => setVinculaciones((prev) => ({ ...prev, [id]: data }));

  if (cargandoPedidos) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
          <Package size={28} className="text-slate-300" />
        </div>
        <p className="font-black text-slate-400 uppercase text-xs tracking-widest">
          Sin pedidos pendientes
        </p>
        <p className="text-slate-300 text-[10px] mt-1 font-medium">
          Los pedidos del catálogo aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pedidos.map((pedido) => {
        const expandido = pedidoExpandido === pedido.id;
        const vinc = getVinculacion(pedido.id);
        const clientesFiltrados = clientes.filter((c) =>
          `${c.nombre} ${c.apellido || ''} ${c.cedula || ''}`
            .toLowerCase()
            .includes(vinc.busqueda.toLowerCase()),
        );
        const fechaRelativa = (() => {
          const diff = Date.now() - new Date(pedido.created_at).getTime();
          const mins = Math.floor(diff / 60000);
          if (mins < 60) return `hace ${mins} min`;
          const hrs = Math.floor(mins / 60);
          if (hrs < 24) return `hace ${hrs}h`;
          return `hace ${Math.floor(hrs / 24)}d`;
        })();

        return (
          <div
            key={pedido.id}
            className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden transition-all"
          >
            {/* Cabecera del pedido */}
            <button
              onClick={() => setPedidoExpandido(expandido ? null : pedido.id)}
              className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Users size={18} className="text-orange-600" />
                </div>
                <div>
                  <p className="font-black text-slate-800 text-sm uppercase leading-none">
                    {pedido.nombre_cliente}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock size={9} /> {fechaRelativa}
                    </span>
                    <span className="text-[9px] font-black text-orange-600">
                      ${pedido.total.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      · {pedido.productos.length} producto
                      {pedido.productos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronDown
                size={18}
                className={`text-slate-400 transition-transform ${expandido ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Detalle expandido */}
            {expandido && (
              <div className="border-t border-slate-100 p-5 space-y-4 bg-slate-50/50">
                {/* Lista de productos del pedido */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                    Productos solicitados
                  </p>
                  {pedido.productos.map((prod: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100"
                    >
                      <div>
                        <p className="font-black text-xs text-slate-800 uppercase">
                          {prod.nombre}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {prod.cant || prod.cantidad}{' '}
                          {prod.unidad_medida || 'UNID.'} × $
                          {prod.precio.toFixed(2)}
                        </p>
                      </div>
                      <p className="font-black text-sm text-orange-600">
                        $
                        {(prod.precio * (prod.cant || prod.cantidad)).toFixed(
                          2,
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Vincular cliente */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                    <UserPlus size={10} /> Vincular cliente (opcional)
                  </p>

                  {vinc.clienteId ? (
                    // Cliente seleccionado
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <p className="font-black text-xs text-emerald-800 uppercase">
                          {clientes.find((c) => c.id === vinc.clienteId)
                            ?.nombre || 'Cliente'}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setVinculacion(pedido.id, {
                            clienteId: '',
                            busqueda: '',
                          })
                        }
                        className="text-slate-400 hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    // Buscador de clientes
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar cliente existente..."
                        value={vinc.busqueda}
                        onChange={(e) =>
                          setVinculacion(pedido.id, {
                            clienteId: '',
                            busqueda: e.target.value,
                          })
                        }
                        className="w-full p-3 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-orange-400 transition-colors"
                      />
                      {vinc.busqueda.length >= 2 &&
                        clientesFiltrados.length > 0 && (
                          <div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-40 overflow-y-auto">
                            {clientesFiltrados.slice(0, 5).map((c) => (
                              <button
                                key={c.id}
                                onClick={() =>
                                  setVinculacion(pedido.id, {
                                    clienteId: c.id,
                                    busqueda: `${c.nombre} ${c.apellido || ''}`,
                                  })
                                }
                                className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-slate-50 last:border-none"
                              >
                                <p className="font-black text-xs text-slate-800 uppercase">
                                  {c.nombre} {c.apellido}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  CI/RIF: {c.cedula || c.rif || 'N/A'}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                  {!vinc.clienteId && (
                    <p className="text-[9px] text-slate-400 font-medium ml-2">
                      Si no vinculas, la venta se registrará como{' '}
                      <strong>"{pedido.nombre_cliente}"</strong>
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() =>
                      onCargarPedido(
                        pedido,
                        vinc.clienteId || null,
                        pedido.nombre_cliente,
                      )
                    }
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={14} /> Cargar en Venta
                  </button>
                  <button
                    onClick={() => onCancelarPedido(pedido.id)}
                    className="px-4 py-3 bg-red-50 text-red-400 hover:bg-red-100 rounded-2xl font-black text-[10px] uppercase transition-all"
                    title="Cancelar pedido"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function CotizarPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [productosInventario, setProductosInventario] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [nombreClienteLibre, setNombreClienteLibre] = useState(''); // para pedidos sin cliente registrado
  const [carrito, setCarrito] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarModalResumen, setMostrarModalResumen] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [tasaBCV, setTasaBCV] = useState<number>(0);
  const [monedaPrincipal, setMonedaPrincipal] = useState<'USD' | 'BS'>('USD');
  const [miEmpresaId, setMiEmpresaId] = useState<string | null>(null);
  const [datosEmpresa, setDatosEmpresa] = useState<any>(null);
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
  const [tipoOperacion, setTipoOperacion] =
    useState<TipoOperacion>('cotizacion');
  const [estadoPago, setEstadoPago] = useState('pendiente_pago');
  const [montoPagado, setMontoPagado] = useState(0);
  const [etiquetaMoneda, setEtiquetaMoneda] = useState<'USD' | 'EUR'>('USD');
  const [modoOperacion, setModoOperacion] = useState<ModoOperacion>('completo');

  // ── Estados para pedidos del catálogo ──────────────────────
  const [pedidosCatalogo, setPedidosCatalogo] = useState<PedidoCatalogo[]>([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [tabActiva, setTabActiva] = useState<'venta' | 'pedidos'>('venta');

  // ── Carga inicial ─────────────────────────────────────────
  useEffect(() => {
    const cargarDatos = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('empresa_id, empresas(*)')
        .eq('id', user.id)
        .single();

      if (!perfil?.empresa_id) return;
      setMiEmpresaId(perfil.empresa_id);

      const emp = Array.isArray(perfil.empresas)
        ? perfil.empresas[0]
        : perfil.empresas;
      setDatosEmpresa(emp);

      const modo: ModoOperacion = emp?.modo_operacion || 'completo';
      setModoOperacion(modo);
      if (modo === 'ticketera') setTipoOperacion('venta_directa');

      const monedaConfig = emp?.moneda_secundaria || 'USD';
      setEtiquetaMoneda(monedaConfig);

      try {
        const endpoint =
          monedaConfig === 'EUR' ? 'euros/oficial' : 'dolares/oficial';
        const res = await fetch(`https://ve.dolarapi.com/v1/${endpoint}`);
        const data = await res.json();
        if (data?.promedio) setTasaBCV(data.promedio);
      } catch (e) {
        console.error('Error tasa:', e);
      }

      const { data: c } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', perfil.empresa_id)
        .order('nombre');
      const { data: p } = await supabase
        .from('productos')
        .select('*')
        .eq('empresa_id', perfil.empresa_id)
        .eq('activo', true)
        .gt('stock', 0)
        .order('nombre');

      if (c) setClientes(c);
      if (p) setProductosInventario(p);

      // Cargar pedidos pendientes del catálogo
      await cargarPedidosPendientes(perfil.empresa_id);
    };
    cargarDatos();
  }, []);

  useEffect(() => {
    document.body.style.overflow = mostrarModalResumen ? 'hidden' : 'unset';
  }, [mostrarModalResumen]);

  // ── Pedidos del catálogo ──────────────────────────────────
  const cargarPedidosPendientes = async (idEmpresa: string) => {
    setCargandoPedidos(true);
    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .select('*')
      .eq('empresa_id', idEmpresa)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });

    if (!error && data) setPedidosCatalogo(data as PedidoCatalogo[]);
    setCargandoPedidos(false);
  };

  /**
   * Carga un pedido del catálogo en el carrito de venta.
   * Si clienteId existe, busca el cliente en la lista; si no, guarda el nombre libre.
   */
  const cargarPedidoEnVenta = useCallback(
    (pedido: PedidoCatalogo, clienteId: string | null, nombreLibre: string) => {
      // Normalizar productos al formato del carrito de CotizarPage
      const productosNormalizados = pedido.productos.map((p: any) => ({
        ...p,
        cantidad: p.cantidad ?? p.cant ?? 1,
        stock: p.stock ?? 9999, // fallback por si no tiene stock en el JSON
      }));

      setCarrito(productosNormalizados);
      setTipoOperacion('venta_directa');

      if (clienteId) {
        const clienteObj = clientes.find((c) => c.id === clienteId);
        setClienteSeleccionado(clienteObj || null);
        setNombreClienteLibre('');
      } else {
        setClienteSeleccionado(null);
        setNombreClienteLibre(nombreLibre);
      }

      // Cambiar a la tab de venta para ver el carrito cargado
      setTabActiva('venta');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [clientes],
  );

  const cancelarPedidoCatalogo = async (id: string) => {
    if (!confirm('¿Cancelar este pedido?')) return;
    const { error } = await supabase
      .from('pedidos_catalogo')
      .update({ estado: 'cancelado' })
      .eq('id', id);
    if (!error) {
      setPedidosCatalogo((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // ── Carrito helpers ───────────────────────────────────────
  const actualizarItem = (
    id: string,
    campo: 'precio' | 'cantidad',
    valor: string,
  ) => {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const num = valor === '' ? 0 : parseFloat(valor);
        if (campo === 'cantidad') {
          if (valor.endsWith('.')) return { ...item, cantidad: valor };
          return { ...item, cantidad: num > item.stock ? item.stock : num };
        }
        return { ...item, [campo]: num };
      }),
    );
  };

  const calcularTotal = () =>
    carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

  const agregarAlCarrito = (prod: any) => {
    if (!carrito.find((i) => i.id === prod.id))
      setCarrito([...carrito, { ...prod, cantidad: 1 }]);
  };

  // ── PDF ───────────────────────────────────────────────────
  const descargarPDF = (
    cliente: any,
    items: any[],
    total: number,
    notas: string,
  ) => {
    try {
      const doc = new jsPDF();
      const gold: [number, number, number] = [184, 134, 11];
      const nombreEmp = datosEmpresa?.nombre || 'MI EMPRESA';
      const logoUrl = datosEmpresa?.logo_url;

      if (logoUrl) {
        try {
          doc.addImage(logoUrl, 'PNG', 10, 10, 35, 35);
        } catch {}
      }

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(nombreEmp.toUpperCase(), 50, 25);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`RIF: ${datosEmpresa?.rif || 'N/A'}`, 50, 32);
      doc.text(
        datosEmpresa?.telefono
          ? `Telf: ${datosEmpresa.telefono}`
          : 'Calidad y confianza',
        50,
        37,
      );

      const titulo =
        tipoOperacion === 'venta_directa' ? 'NOTA DE ENTREGA' : 'COTIZACIÓN';
      doc.setTextColor(...gold);
      doc.setFontSize(16);
      doc.text(titulo, 196, 25, { align: 'right' });
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`N°: ${Math.floor(Date.now() / 10000)}`, 196, 32, {
        align: 'right',
      });
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 196, 37, {
        align: 'right',
      });
      doc.setDrawColor(...gold);
      doc.setLineWidth(1);
      doc.line(14, 58, 196, 58);

      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 65, 182, 35, 2, 2);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENTE:', 20, 72);
      doc.text('RIF / C.I.:', 20, 79);
      doc.text('NOTAS:', 20, 86);
      doc.setFont('helvetica', 'normal');
      const nombreMostrar = cliente
        ? `${cliente.nombre?.toUpperCase()} ${cliente.apellido?.toUpperCase() || ''}`
        : nombreClienteLibre.toUpperCase() || 'CONSUMIDOR FINAL';
      doc.text(nombreMostrar, 50, 72);
      doc.text(
        cliente ? `${cliente.cedula || cliente.rif || 'N/A'}` : 'N/A',
        50,
        79,
      );
      doc.text(doc.splitTextToSize(notas || 'Por definir', 135), 50, 86);

      const simbolo =
        monedaPrincipal === 'BS' ? 'Bs.' : etiquetaMoneda === 'EUR' ? '€' : '$';
      const factor = monedaPrincipal === 'BS' ? tasaBCV : 1;

      autoTable(doc, {
        startY: 105,
        head: [['DESCRIPCIÓN', 'CANT.', 'PRECIO', 'SUBTOTAL']],
        body: items.map((i) => [
          `${i.nombre.toUpperCase()}\n[UNIDAD: ${i.unidad_medida || 'UNID.'}]`,
          i.cantidad.toString(),
          `${simbolo} ${(i.precio * factor).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
          `${simbolo} ${(i.precio * i.cantidad * factor).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
        ]),
        headStyles: { fillColor: [30, 41, 59], halign: 'center' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;

      if (tipoOperacion === 'venta_directa') {
        const totalM = total * factor;
        const resta = totalM - montoPagado;
        let colorS = [239, 68, 68];
        let textoS = 'PENDIENTE';
        if (estadoPago === 'pagado') {
          colorS = [34, 197, 94];
          textoS = 'PAGADO';
        }
        if (estadoPago === 'pago_parcial') {
          colorS = [234, 179, 8];
          textoS = 'ABONO';
        }

        doc.setDrawColor(...(colorS as [number, number, number]));
        doc.setTextColor(...(colorS as [number, number, number]));
        doc.setLineWidth(1.5);
        doc.roundedRect(14, finalY, 50, 18, 3, 3);
        doc.setFontSize(14);
        doc.text(textoS, 39, finalY + 11, { align: 'center' });
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        doc.text(
          `TOTAL: ${simbolo} ${totalM.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
          196,
          finalY + 5,
          { align: 'right' },
        );

        if (estadoPago === 'pago_parcial') {
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          doc.text(
            `Recibido: ${simbolo} ${montoPagado.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
            196,
            finalY + 12,
            { align: 'right' },
          );
          doc.setTextColor(200, 0, 0);
          doc.setFont('helvetica', 'bold');
          doc.text(
            `RESTA: ${simbolo} ${resta.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
            196,
            finalY + 19,
            { align: 'right' },
          );
        }
      } else {
        doc.setFontSize(14);
        doc.setTextColor(...gold);
        doc.text(
          `TOTAL PRESUPUESTO: ${simbolo} ${(total * factor).toLocaleString('es-VE')}`,
          196,
          finalY + 5,
          { align: 'right' },
        );
      }

      doc.save(
        `${tipoOperacion === 'venta_directa' ? 'Nota_Entrega' : 'Cotizacion'}_${nombreMostrar}.pdf`,
      );
    } catch (err) {
      console.error(err);
      alert('Error al generar PDF');
    }
  };

  const enviarWhatsApp = (
    cliente: any,
    total: number,
    items: any[],
    notas: string,
    moneda: string,
    tasa: number,
  ) => {
    let telefono = cliente?.telefono;
    if (!telefono) {
      const t = prompt('Ingresa el número de WhatsApp (ej: 584121234567):');
      if (!t) return;
      telefono = t;
    }
    const factor = moneda === 'BS' ? tasa : 1;
    const simbolo = moneda === 'BS' ? 'Bs.' : '$';
    const lista = items
      .map(
        (i) =>
          `🔹 *${i.nombre.trim()}*\n    Cant: ${i.cantidad} ${i.unidad_medida || 'UNID.'} -> ${simbolo}${(i.precio * i.cantidad * factor).toLocaleString('es-VE')}`,
      )
      .join('\n\n');
    const msg = `🏗️ *${datosEmpresa?.nombre || 'MI EMPRESA'}*\n----\n👤 *Cliente:* ${cliente?.nombre || nombreClienteLibre}\n📍 *Entrega:* ${notas || 'Retiro en tienda'}\n\n${lista}\n\n💵 *TOTAL: ${simbolo} ${(total * factor).toLocaleString('es-VE')}*\n----\n¡Estamos para servirle!`;
    window.open(
      `https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`,
      '_blank',
    );
  };

  const descontarInventario = async (items: any[]) => {
    const itemsSimplificados = items.map((i) => ({
      id: i.id,
      cantidad: i.cantidad,
    }));
    const { error } = await supabase.rpc('procesar_descuento_inventario', {
      items: itemsSimplificados,
    });
    if (error) {
      console.error('Error al descontar inventario:', error.message);
      throw new Error('No se pudo actualizar el inventario');
    }
  };

  // ── Procesar venta ────────────────────────────────────────
  const procesarVenta = async (pedidoCatalogoId?: string) => {
    if (
      modoOperacion === 'completo' &&
      !clienteSeleccionado &&
      !nombreClienteLibre
    )
      return alert('Selecciona un cliente o ingresa un nombre');
    if (carrito.length === 0) return alert('Agrega productos al carrito');
    if (!miEmpresaId) return alert('Error de sesión');

    setCargando(true);
    try {
      const total = calcularTotal();
      const esVenta = tipoOperacion === 'venta_directa';
      const montoPagadoUsd =
        monedaPrincipal === 'BS' ? montoPagado / tasaBCV : montoPagado;

      const { data: nuevaCot, error: errorCot } = await supabase
        .from('cotizaciones')
        .insert([
          {
            cliente_id: clienteSeleccionado?.id || null,
            nombre_cliente_libre: nombreClienteLibre || null, // campo extra para clientes sin registro
            productos_seleccionados: carrito,
            total,
            empresa_id: miEmpresaId,
            estado: esVenta ? 'aprobado' : 'pendiente',
            tipo_operacion: tipoOperacion,
            estado_pago: esVenta
              ? montoPagadoUsd >= total - 0.05
                ? 'pagado'
                : 'parcial'
              : 'pendiente_pago',
            monto_pagado: montoPagadoUsd,
            moneda: monedaPrincipal,
            tasa_bcv: tasaBCV,
            observaciones,
          },
        ])
        .select()
        .single();

      if (errorCot) throw errorCot;

      if (esVenta && montoPagado > 0) {
        await supabase.from('pagos_registrados').insert([
          {
            cotizacion_id: nuevaCot.id,
            monto_bs: monedaPrincipal === 'BS' ? montoPagado : 0,
            monto_usd: monedaPrincipal === 'USD' ? montoPagado : 0,
            tasa_aplicada: tasaBCV,
            observacion: `Venta directa - ${clienteSeleccionado?.nombre || nombreClienteLibre || 'Consumidor Final'}`,
          },
        ]);
      }

      if (esVenta) await descontarInventario(carrito);

      // Marcar pedido del catálogo como procesado si corresponde
      if (pedidoCatalogoId) {
        await supabase
          .from('pedidos_catalogo')
          .update({ estado: 'procesado' })
          .eq('id', pedidoCatalogoId);
        setPedidosCatalogo((prev) =>
          prev.filter((p) => p.id !== pedidoCatalogoId),
        );
      }

      // Comprobante
      if (modoOperacion === 'ticketera') {
        imprimirTicket({
          empresa: datosEmpresa,
          cliente: clienteSeleccionado,
          items: carrito,
          total,
          tasaBCV,
          etiquetaMoneda,
          monedaPrincipal,
          estadoPago,
          montoPagado,
          observaciones,
        });
      } else {
        descargarPDF(clienteSeleccionado, carrito, total, observaciones);
        setTimeout(() => {
          if (clienteSeleccionado && confirm('¿Deseas enviar por WhatsApp?'))
            enviarWhatsApp(
              clienteSeleccionado,
              total,
              carrito,
              observaciones,
              monedaPrincipal,
              tasaBCV,
            );
        }, 500);
      }

      // Limpiar
      setCarrito([]);
      setClienteSeleccionado(null);
      setNombreClienteLibre('');
      setObservaciones('');
      setMontoPagado(0);
      setMostrarModalResumen(false);
      alert(esVenta ? '✅ Venta registrada' : '📄 Cotización guardada');
    } catch (e) {
      console.error(e);
      alert('Error al procesar la operación');
    } finally {
      setCargando(false);
    }
  };

  const renderSeccionPago = () => {
    if (tipoOperacion !== 'venta_directa') return null;
    return (
      <div
        className={`mb-6 space-y-4 p-5 rounded-[2rem] border-2 ${monedaPrincipal === 'BS' ? 'bg-orange-50/20 border-orange-100' : 'bg-slate-800/50 border-white/10'}`}
      >
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">
          Estado del Pago
        </label>
        <select
          value={estadoPago}
          onChange={(e) => {
            setEstadoPago(e.target.value);
            if (e.target.value === 'pagado')
              setMontoPagado(
                calcularTotal() * (monedaPrincipal === 'BS' ? tasaBCV : 1),
              );
          }}
          className="w-full p-4 bg-white text-slate-900 rounded-2xl font-bold border-2 border-slate-200 outline-none"
        >
          <option value="pendiente_pago">❌ Pendiente</option>
          <option value="pago_parcial">⏳ Abono / Parcial</option>
          <option value="pagado">✅ Pagado Total</option>
        </select>
        {estadoPago !== 'pendiente_pago' && (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">
              Monto Recibido ({monedaPrincipal === 'BS' ? 'Bs.' : '$'})
            </label>
            <input
              type="number"
              value={montoPagado === 0 ? '' : montoPagado}
              onChange={(e) =>
                setMontoPagado(
                  e.target.value === '' ? 0 : parseFloat(e.target.value),
                )
              }
              placeholder="0.00"
              className="w-full p-4 bg-white text-slate-900 rounded-2xl font-black text-xl border-2 border-orange-500 outline-none"
            />
          </div>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <main
      style={{ overscrollBehaviorY: 'contain', touchAction: 'pan-x pan-y' }}
      className="min-h-screen bg-slate-50 p-4 md:p-8 pb-32"
    >
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* ── IZQUIERDA: tabs + contenido ── */}
        <div className="flex-1 space-y-6">
          {/* Tabs: Nueva Venta | Pedidos del Catálogo */}
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-200 p-1.5 rounded-2xl shadow-inner">
              <button
                onClick={() => setTabActiva('venta')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase ${tabActiva === 'venta' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
              >
                {modoOperacion === 'ticketera'
                  ? '🖨️ Punto de Venta'
                  : '📋 Nueva Venta'}
              </button>
              <button
                onClick={() => {
                  setTabActiva('pedidos');
                  if (miEmpresaId) cargarPedidosPendientes(miEmpresaId);
                }}
                className={`relative px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase ${tabActiva === 'pedidos' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'text-slate-500'}`}
              >
                <Bell size={12} className="inline mr-1" />
                Pedidos del Catálogo
                {pedidosCatalogo.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-200">
                    {pedidosCatalogo.length}
                  </span>
                )}
              </button>
            </div>

            {/* Switch Cotización/Venta (solo en tab venta y modo completo) */}
            {tabActiva === 'venta' && modoOperacion === 'completo' && (
              <div className="flex bg-slate-200 p-1.5 rounded-2xl shadow-inner ml-auto">
                <button
                  onClick={() => setTipoOperacion('cotizacion')}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all uppercase ${tipoOperacion === 'cotizacion' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Cotización
                </button>
                <button
                  onClick={() => setTipoOperacion('venta_directa')}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all uppercase ${tipoOperacion === 'venta_directa' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'text-slate-500'}`}
                >
                  Venta Directa
                </button>
              </div>
            )}
          </div>

          {/* ── TAB: PEDIDOS DEL CATÁLOGO ── */}
          {tabActiva === 'pedidos' && (
            <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-black text-slate-800 text-lg uppercase tracking-tighter">
                    Pedidos Pendientes
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Del catálogo público · toca un pedido para cargarlo en venta
                  </p>
                </div>
                <button
                  onClick={() =>
                    miEmpresaId && cargarPedidosPendientes(miEmpresaId)
                  }
                  className="p-3 bg-slate-100 hover:bg-orange-100 text-slate-400 hover:text-orange-600 rounded-2xl transition-all"
                  title="Actualizar"
                >
                  <Loader2
                    size={16}
                    className={cargandoPedidos ? 'animate-spin' : ''}
                  />
                </button>
              </div>

              <PanelPedidosCatalogo
                pedidos={pedidosCatalogo}
                clientes={clientes}
                cargandoPedidos={cargandoPedidos}
                onCargarPedido={cargarPedidoEnVenta}
                onCancelarPedido={cancelarPedidoCatalogo}
              />
            </section>
          )}

          {/* ── TAB: NUEVA VENTA ── */}
          {tabActiva === 'venta' && (
            <>
              {/* Aviso si el carrito viene de un pedido del catálogo */}
              {nombreClienteLibre && carrito.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-[2rem] flex items-center gap-3">
                  <AlertCircle
                    size={20}
                    className="text-orange-500 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <p className="font-black text-orange-800 text-xs uppercase">
                      Pedido cargado de:{' '}
                      <span className="text-orange-600">
                        {nombreClienteLibre}
                      </span>
                    </p>
                    <p className="text-[10px] text-orange-500 font-medium">
                      Cliente del catálogo · revisa y ajusta antes de confirmar
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setNombreClienteLibre('');
                      setCarrito([]);
                    }}
                    className="text-orange-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* CLIENTE */}
              <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">
                  {modoOperacion === 'ticketera'
                    ? 'Cliente (Opcional)'
                    : 'Cliente'}
                </label>

                {/* Si hay nombre libre del catálogo, lo mostramos editable */}
                {nombreClienteLibre && !clienteSeleccionado ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-orange-50 border-2 border-orange-200 p-4 rounded-2xl">
                      <Users size={16} className="text-orange-500" />
                      <input
                        type="text"
                        value={nombreClienteLibre}
                        onChange={(e) => setNombreClienteLibre(e.target.value)}
                        className="flex-1 bg-transparent font-black text-orange-800 text-sm uppercase outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setNombreClienteLibre('')}
                      className="text-[10px] font-black text-slate-400 hover:text-orange-500 ml-2 uppercase"
                    >
                      + Vincular con cliente registrado
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setMostrarListaClientes(!mostrarListaClientes)
                      }
                      className="w-full pl-6 pr-12 py-5 bg-slate-50 rounded-[1.5rem] text-left border-2 border-slate-100 text-xl font-bold flex justify-between items-center"
                    >
                      <span
                        className={
                          clienteSeleccionado
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }
                      >
                        {clienteSeleccionado
                          ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido || ''}`
                          : modoOperacion === 'ticketera'
                            ? 'Consumidor Final'
                            : 'Selecciona un cliente...'}
                      </span>
                      <ChevronDown size={24} className="text-slate-400" />
                    </button>

                    {modoOperacion === 'ticketera' && clienteSeleccionado && (
                      <button
                        onClick={() => setClienteSeleccionado(null)}
                        className="absolute right-14 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-400"
                      >
                        <X size={18} />
                      </button>
                    )}

                    {mostrarListaClientes && (
                      <div className="absolute z-[100] left-0 right-0 mt-2 bg-white rounded-[1.5rem] shadow-2xl border border-slate-300 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                          <input
                            type="text"
                            placeholder="Escribe para filtrar..."
                            className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none"
                            onChange={(e) => setBusquedaCliente(e.target.value)}
                          />
                        </div>
                        {modoOperacion === 'ticketera' && (
                          <div
                            onClick={() => {
                              setClienteSeleccionado(null);
                              setMostrarListaClientes(false);
                            }}
                            className="p-4 hover:bg-orange-50 cursor-pointer border-b border-slate-100 bg-slate-50"
                          >
                            <p className="font-bold text-slate-500 uppercase text-sm">
                              👤 Consumidor Final
                            </p>
                            <p className="text-xs text-slate-400">
                              Venta sin cliente registrado
                            </p>
                          </div>
                        )}
                        <div className="max-h-[300px] overflow-y-auto">
                          {clientes
                            .filter((c) =>
                              `${c.nombre} ${c.cedula}`
                                .toLowerCase()
                                .includes(busquedaCliente.toLowerCase()),
                            )
                            .map((c) => (
                              <div
                                key={c.id}
                                onClick={() => {
                                  setClienteSeleccionado(c);
                                  setNombreClienteLibre('');
                                  setMostrarListaClientes(false);
                                }}
                                className="p-4 hover:bg-orange-50 cursor-pointer border-b border-slate-50 last:border-none"
                              >
                                <p className="font-bold text-slate-800 uppercase">
                                  {c.nombre} {c.apellido}
                                </p>
                                <p className="text-xs text-slate-400">
                                  CI/RIF: {c.cedula || c.rif}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* TASA */}
              <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-600 p-4 rounded-2xl shadow-lg shadow-orange-200">
                    {etiquetaMoneda === 'EUR' ? (
                      <span className="text-white text-2xl font-black px-1">
                        €
                      </span>
                    ) : (
                      <DollarSign className="text-white" size={28} />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Tasa BCV (Bs/{etiquetaMoneda === 'EUR' ? '€' : '$'})
                    </p>
                    <input
                      type="number"
                      step="any"
                      placeholder="Cargando..."
                      value={tasaBCV === 0 ? '' : tasaBCV}
                      onChange={(e) =>
                        setTasaBCV(parseFloat(e.target.value) || 0)
                      }
                      className="text-3xl font-black text-slate-800 bg-transparent border-b-4 border-orange-500 outline-none w-40 px-2"
                    />
                  </div>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  <button
                    onClick={() => setMonedaPrincipal('USD')}
                    className={`px-8 py-3 rounded-xl font-black text-[10px] transition-all uppercase ${monedaPrincipal === 'USD' ? 'bg-[#1A1C1E] text-white shadow-lg' : 'text-slate-400'}`}
                  >
                    {etiquetaMoneda} {etiquetaMoneda === 'EUR' ? '€' : '$'}
                  </button>
                  <button
                    onClick={() => setMonedaPrincipal('BS')}
                    className={`px-8 py-3 rounded-xl font-black text-[10px] transition-all uppercase ${monedaPrincipal === 'BS' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400'}`}
                  >
                    BS.
                  </button>
                </div>
              </section>

              {/* PRODUCTOS */}
              <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="relative mb-6">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={24}
                  />
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    className="w-full pl-14 pr-4 py-5 bg-slate-50 rounded-[1.5rem] outline-none ring-2 ring-slate-100 text-xl font-medium"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[500px] overflow-y-auto pr-2">
                  {productosInventario
                    .filter((p) =>
                      p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
                    )
                    .map((p) => {
                      const esStockCritico = p.stock <= 5;
                      const inCarrito = carrito.find((i) => i.id === p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => agregarAlCarrito(p)}
                          className={`p-6 rounded-[2.5rem] border-2 text-left transition-all relative group ${
                            inCarrito
                              ? 'border-orange-500 bg-orange-50/30 shadow-lg shadow-orange-100'
                              : esStockCritico
                                ? 'border-red-100 bg-red-50/20 shadow-sm'
                                : 'border-white bg-white hover:border-slate-200'
                          }`}
                        >
                          {esStockCritico && !inCarrito && (
                            <div className="absolute -top-2 -left-2 bg-red-500 text-white text-[8px] font-black px-3 py-1 rounded-full shadow-lg animate-pulse uppercase z-10">
                              Stock Bajo
                            </div>
                          )}
                          {inCarrito && (
                            <div className="absolute -top-3 -right-3 bg-orange-600 text-white font-black w-11 h-11 rounded-full flex items-center justify-center shadow-xl text-lg ring-4 ring-white animate-in zoom-in">
                              {inCarrito.cantidad}
                            </div>
                          )}
                          <p
                            className={`font-black text-xl mb-2 italic uppercase tracking-tighter ${esStockCritico ? 'text-red-700' : 'text-slate-800 group-hover:text-orange-600'}`}
                          >
                            {p.nombre}
                          </p>
                          <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                              <span
                                className={`text-2xl font-black leading-none ${esStockCritico ? 'text-red-600' : 'text-orange-500'}`}
                              >
                                {etiquetaMoneda === 'EUR' ? '€' : '$'}{' '}
                                {p.precio.toLocaleString()}
                              </span>
                              {monedaPrincipal === 'BS' && (
                                <span className="text-[11px] font-black text-emerald-600 mt-1 uppercase">
                                  ≈ Bs.{' '}
                                  {(p.precio * tasaBCV).toLocaleString(
                                    'es-VE',
                                    { minimumFractionDigits: 2 },
                                  )}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-3 py-1 rounded-lg ${esStockCritico ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`}
                            >
                              Stock: {p.stock}
                            </span>
                          </div>
                          <div className="mt-4 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${esStockCritico ? 'bg-red-500' : 'bg-orange-400'}`}
                              style={{
                                width: `${Math.min((p.stock / 20) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </button>
                      );
                    })}
                </div>
              </section>
            </>
          )}
        </div>

        {/* ── DERECHA: Resumen escritorio ── */}
        <div className="hidden lg:block w-[450px]">
          <div className="bg-[#1A1C1E] p-8 rounded-[3rem] shadow-2xl border-t-8 border-orange-600 sticky top-8 text-white">
            <h2 className="text-2xl font-black mb-6 italic uppercase tracking-tighter flex justify-between items-center">
              Resumen <ShoppingCart className="text-orange-500" />
            </h2>

            {carrito.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package size={32} className="text-white/20 mb-3" />
                <p className="text-white/30 font-black uppercase text-xs tracking-widest">
                  Carrito vacío
                </p>
                {pedidosCatalogo.length > 0 && (
                  <button
                    onClick={() => setTabActiva('pedidos')}
                    className="mt-4 text-[10px] font-black text-orange-400 uppercase flex items-center gap-1"
                  >
                    <Bell size={12} /> {pedidosCatalogo.length} pedido
                    {pedidosCatalogo.length > 1 ? 's' : ''} del catálogo
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="max-h-[320px] overflow-y-auto pr-2 custom-scroll-dark space-y-4 mb-4">
                  {carrito.map((item) => (
                    <TarjetaProductoCarrito
                      key={`esc-${item.id}`}
                      item={item}
                      actualizarItem={actualizarItem}
                      setCarrito={setCarrito}
                      carrito={carrito}
                      etiquetaMoneda={etiquetaMoneda}
                      monedaPrincipal={monedaPrincipal}
                      tasaBCV={tasaBCV}
                      isDark={true}
                    />
                  ))}
                </div>
                {renderSeccionPago()}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex flex-col items-end mb-6">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">
                      Total a Cobrar
                    </span>
                    <span className="text-5xl font-black text-white tracking-tighter italic">
                      {etiquetaMoneda === 'EUR' ? '€' : '$'}
                      {calcularTotal().toLocaleString()}
                    </span>
                    <div className="mt-2 bg-orange-600 px-4 py-1 rounded-full shadow-lg shadow-orange-900/40">
                      <span className="text-lg font-black text-white italic">
                        Bs.{' '}
                        {(calcularTotal() * tasaBCV).toLocaleString('es-VE')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => procesarVenta()}
                    disabled={cargando}
                    className="w-full py-6 rounded-[2rem] font-black text-xl text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-40 shadow-xl shadow-orange-900/40 transition-all active:scale-95 uppercase italic tracking-tighter flex items-center justify-center gap-3"
                  >
                    {cargando ? (
                      'PROCESANDO...'
                    ) : (
                      <>
                        {modoOperacion === 'ticketera' ? (
                          <Printer size={22} />
                        ) : (
                          <FileText size={22} />
                        )}
                        {tipoOperacion === 'cotizacion'
                          ? 'Confirmar Presupuesto'
                          : modoOperacion === 'ticketera'
                            ? 'Cobrar e Imprimir'
                            : 'Registrar Venta'}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FLOTANTE MÓVIL */}
      {carrito.length > 0 && !mostrarModalResumen && (
        <div className="lg:hidden fixed bottom-8 left-4 right-4 z-[90]">
          <button
            onClick={() => setMostrarModalResumen(true)}
            className="w-full bg-slate-900 text-white p-5 rounded-[2.5rem] shadow-2xl flex items-center justify-between border border-white/10"
          >
            <div className="flex items-center gap-4">
              <div className="relative bg-orange-600 p-3 rounded-2xl">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 bg-red-500 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900">
                  {carrito.length}
                </span>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase">
                  Total
                </p>
                <p className="text-2xl font-black text-orange-400">
                  {etiquetaMoneda === 'EUR' ? '€' : '$'}
                  {calcularTotal().toLocaleString()}
                </p>
                <p className="text-sm text-emerald-400 font-bold">
                  Bs.{' '}
                  {(calcularTotal() * tasaBCV).toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 font-black text-orange-400">
              REVISAR <ChevronUp size={20} />
            </div>
          </button>
        </div>
      )}

      {/* MODAL MÓVIL */}
      {mostrarModalResumen && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end">
          <div
            className="bg-white rounded-t-[3rem] p-6 max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300"
            style={{ overscrollBehavior: 'none' }}
          >
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-2xl font-black text-slate-800">Tu Pedido</h2>
              <button
                onClick={() => setMostrarModalResumen(false)}
                className="p-3 bg-slate-100 rounded-full text-slate-500"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-6 mb-4 custom-scroll">
              <div className="space-y-4">
                {carrito.map((item) => (
                  <TarjetaProductoCarrito
                    key={`movil-${item.id}`}
                    item={item}
                    actualizarItem={actualizarItem}
                    setCarrito={setCarrito}
                    carrito={carrito}
                    etiquetaMoneda={etiquetaMoneda}
                    monedaPrincipal={monedaPrincipal}
                    tasaBCV={tasaBCV}
                  />
                ))}
              </div>
              {renderSeccionPago()}
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas o dirección de envío..."
                className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 text-sm outline-none focus:border-orange-500 transition-colors"
                rows={2}
              />
            </div>
            <div className="space-y-4 pt-4 border-t border-slate-100 flex-shrink-0">
              <div className="flex justify-between items-center px-2">
                <span className="font-black text-slate-400">TOTAL</span>
                <div className="text-right">
                  <span className="text-3xl font-black text-orange-700 block">
                    {etiquetaMoneda === 'EUR' ? '€' : '$'}
                    {calcularTotal().toLocaleString()}
                  </span>
                  {monedaPrincipal === 'BS' && (
                    <span className="text-sm font-bold text-emerald-600">
                      Bs. {(calcularTotal() * tasaBCV).toLocaleString('es-VE')}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => procesarVenta()}
                disabled={cargando}
                className={`w-full py-5 rounded-[2rem] font-black text-xl text-white shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3 disabled:opacity-40 ${tipoOperacion === 'cotizacion' ? 'bg-orange-600' : 'bg-emerald-600'}`}
              >
                {modoOperacion === 'ticketera' ? (
                  <Printer size={20} />
                ) : (
                  <FileText size={20} />
                )}
                {cargando
                  ? 'PROCESANDO...'
                  : modoOperacion === 'ticketera'
                    ? 'COBRAR E IMPRIMIR'
                    : 'CONFIRMAR Y GENERAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scroll-dark::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scroll-dark::-webkit-scrollbar-thumb {
          background: #ff6b00;
          border-radius: 10px;
        }
        .custom-scroll-dark::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </main>
  );
}

// ── TarjetaProductoCarrito ────────────────────────────────────
function TarjetaProductoCarrito({
  item,
  actualizarItem,
  setCarrito,
  carrito,
  isDark = false,
  etiquetaMoneda,
  monedaPrincipal,
  tasaBCV,
}: any) {
  const factor = monedaPrincipal === 'BS' ? tasaBCV : 1;
  return (
    <div
      className={`p-4 rounded-3xl mb-3 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
    >
      <div className="flex justify-between items-start mb-3">
        <p
          className={`font-black text-sm uppercase italic ${isDark ? 'text-white' : 'text-slate-800'}`}
        >
          {item.nombre}
        </p>
        <button
          onClick={() =>
            setCarrito(carrito.filter((i: any) => i.id !== item.id))
          }
          className="text-red-400 hover:text-red-500"
        >
          <Trash2 size={18} />
        </button>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <label
            className={`text-[9px] font-black uppercase mb-1 block ${isDark ? 'text-orange-400' : 'text-slate-400'}`}
          >
            CANTIDAD
          </label>
          <div className="flex items-center bg-white rounded-xl p-1 shadow-inner">
            <button
              onClick={() =>
                actualizarItem(
                  item.id,
                  'cantidad',
                  (item.cantidad - 1).toString(),
                )
              }
              className="p-1 text-slate-400"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              step="0.1"
              value={item.cantidad}
              onChange={(e) =>
                actualizarItem(item.id, 'cantidad', e.target.value)
              }
              className="w-full text-center font-black text-slate-900 bg-transparent outline-none"
            />
            <button
              onClick={() =>
                actualizarItem(
                  item.id,
                  'cantidad',
                  (item.cantidad + 1).toString(),
                )
              }
              className="p-1 text-orange-600"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div className="text-right">
          <p
            className={`text-[9px] font-black uppercase mb-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}
          >
            Subtotal
          </p>
          <p
            className={`font-black text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            {monedaPrincipal === 'BS'
              ? 'Bs.'
              : etiquetaMoneda === 'EUR'
                ? '€'
                : '$'}{' '}
            {(item.precio * item.cantidad * factor).toLocaleString('es-VE', {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
