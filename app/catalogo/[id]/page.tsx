'use client';
import { useEffect, useState, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  ShoppingCart,
  Search,
  MessageCircle,
  Building2,
  Package,
  X,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  CreditCard,
  Banknote,
  Smartphone,
  Zap,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

// ── Métodos de pago ───────────────────────────────────────────
const METODOS_PAGO = [
  {
    id: 'efectivo_usd',
    label: 'Efectivo USD',
    icon: '💵',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  {
    id: 'efectivo_bs',
    label: 'Efectivo Bs.',
    icon: '💴',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  {
    id: 'pago_movil',
    label: 'Pago Móvil',
    icon: '📱',
    color: 'bg-violet-50 border-violet-200 text-violet-700',
  },
  {
    id: 'zelle',
    label: 'Zelle',
    icon: '⚡',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
  },
  {
    id: 'transferencia',
    label: 'Transferencia',
    icon: '🏦',
    color: 'bg-slate-50 border-slate-200 text-slate-700',
  },
  {
    id: 'otro',
    label: 'Otro',
    icon: '💳',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
  },
] as const;

type MetodoPago = (typeof METODOS_PAGO)[number]['id'];

// ── Imagen con skeleton ───────────────────────────────────────
function ImagenConCarga({ url, nombre }: { url: string; nombre: string }) {
  const [cargada, setCargada] = useState(false);
  return (
    <div className="relative w-full h-full">
      {!cargada && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse" />
      )}
      <img
        src={url}
        alt={nombre}
        loading="lazy"
        decoding="async"
        onLoad={() => setCargada(true)}
        className={`w-full h-full object-cover transition-all duration-700 ${cargada ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      />
    </div>
  );
}

export default function CatalogoPublico({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const empresaId = resolvedParams.id;
  const supabase = createClient();

  const [empresa, setEmpresa] = useState<any>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [carrito, setCarrito] = useState<any[]>([]);
  const [tasa, setTasa] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [catSeleccionada, setCatSeleccionada] = useState('todas');
  const [moneda, setMoneda] = useState('BS');
  const [pagina, setPagina] = useState(0);
  const [tieneMas, setTieneMas] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const ITEMS_POR_PAGINA = 12;

  // ── Datos del cliente en el carrito ──────────────────────
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [direccionCliente, setDireccionCliente] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo_usd');
  const [tipoEntrega, setTipoEntrega] = useState<'retiro' | 'delivery'>(
    'retiro',
  );
  const [mostrarPagoMovil, setMostrarPagoMovil] = useState(false);

  // Ocultar navbar de la app
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'hide-navbar-forced';
    style.innerHTML = `nav, header, aside, [role="navigation"] { display: none !important; } body { padding-top: 0 !important; }`;
    document.head.appendChild(style);
    return () => document.getElementById('hide-navbar-forced')?.remove();
  }, []);

  // ── Productos paginados ────────────────────────────────────
  // Doble filtro: es_materia_prima = false Y excluir categoría "Materia Prima"
  const obtenerProductos = async (idEmpresa: string, reiniciar = false) => {
    try {
      const nuevaPagina = reiniciar ? 0 : pagina;
      if (!reiniciar) setCargandoMas(true);
      const desde = nuevaPagina * ITEMS_POR_PAGINA;

      // Primero obtenemos el id de la categoría "Materia Prima" si existe
      const { data: catMP } = await supabase
        .from('categorias')
        .select('id')
        .eq('empresa_id', idEmpresa)
        .ilike('nombre', 'materia prima')
        .maybeSingle();

      let query = supabase
        .from('productos')
        .select('*, categorias(nombre)')
        .eq('empresa_id', idEmpresa)
        .eq('activo', true)
        .eq('es_materia_prima', false) // filtro principal
        .gt('stock', 0)
        .order('nombre', { ascending: true })
        .range(desde, desde + ITEMS_POR_PAGINA - 1);

      // Si existe la categoría "Materia Prima", también excluirla por id
      if (catMP?.id) {
        query = query.neq('categoria_id', catMP.id);
      }

      if (catSeleccionada !== 'todas')
        query = query.eq('categoria_id', catSeleccionada);

      const { data, error } = await query;
      if (error) throw error;

      if (reiniciar) {
        setProductos(data || []);
        setPagina(1);
      } else {
        setProductos((prev) => [...prev, ...(data || [])]);
        setPagina(nuevaPagina + 1);
      }
      setTieneMas((data?.length ?? 0) === ITEMS_POR_PAGINA);
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoMas(false);
    }
  };

  useEffect(() => {
    const cargarDatosBase = async () => {
      if (!empresaId) return;
      try {
        const { data: emp } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', empresaId)
          .single();
        setEmpresa(emp);

        const monedaConfig = emp?.moneda_secundaria || 'BS';
        setMoneda(monedaConfig);

        const urlTasa =
          monedaConfig === 'EUR'
            ? 'https://ve.dolarapi.com/v1/euros/oficial'
            : 'https://ve.dolarapi.com/v1/dolares/oficial';
        const res = await fetch(urlTasa);
        const d = await res.json();
        setTasa(d.promedio || 0);

        // Cargar categorías excluyendo "Materia Prima"
        const { data: cats } = await supabase
          .from('categorias')
          .select('*')
          .eq('empresa_id', empresaId)
          .not('nombre', 'ilike', 'materia prima')
          .order('nombre');
        setCategorias(cats || []);

        await obtenerProductos(empresaId, true);
      } finally {
        setLoading(false);
      }
    };
    cargarDatosBase();
  }, [empresaId]);

  useEffect(() => {
    if (empresaId && !loading) obtenerProductos(empresaId, true);
  }, [catSeleccionada]);

  // ── Carrito helpers ───────────────────────────────────────
  const agregarAlCarrito = (p: any) =>
    setCarrito((prev) => {
      const ex = prev.find((i) => i.id === p.id);
      if (ex)
        return prev.map((i) =>
          i.id === p.id ? { ...i, cant: i.cant + 1 } : i,
        );
      return [...prev, { ...p, cant: 1 }];
    });

  const eliminarDelCarrito = (id: string) =>
    setCarrito((prev) => prev.filter((i) => i.id !== id));

  const actualizarCant = (id: string, nuevaCant: number) =>
    setCarrito(
      (prev) =>
        prev
          .map((item) =>
            item.id !== id
              ? item
              : nuevaCant <= 0
                ? null
                : { ...item, cant: nuevaCant },
          )
          .filter(Boolean) as any[],
    );

  const manejarInputCant = (id: string, valor: string) => {
    const num = parseInt(valor);
    if (!isNaN(num)) actualizarCant(id, num);
    else if (valor === '')
      setCarrito((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, cant: '' as any } : item,
        ),
      );
  };

  const validarInputBlur = (id: string, cantActual: any) => {
    if (cantActual === '' || isNaN(cantActual) || cantActual < 1)
      actualizarCant(id, 1);
  };

  const totalDolar = carrito.reduce((acc, p) => acc + p.precio * p.cant, 0);
  const totalBs = totalDolar * tasa;

  const metodoLabel =
    METODOS_PAGO.find((m) => m.id === metodoPago)?.label || metodoPago;

  // ── Enviar pedido ─────────────────────────────────────────
  const enviarPedido = async () => {
    if (!nombreCliente.trim()) {
      alert('Por favor, ingresa tu nombre.');
      return;
    }
    const telefonoEmpresa = empresa?.telefono?.replace(/\D/g, '');
    if (!telefonoEmpresa || telefonoEmpresa.length < 7) {
      alert('⚠️ Esta empresa aún no ha configurado un número de WhatsApp.');
      return;
    }
    setEnviando(true);
    try {
      const productosNormalizados = carrito.map((i) => ({
        id: i.id,
        nombre: i.nombre,
        precio: i.precio,
        cantidad: i.cant,
        cant: i.cant,
        unidad_medida: i.unidad_medida || 'UNIDADES',
        imagen_url: i.imagen_url || null,
        stock: i.stock,
      }));

      // Guardar pedido con datos extra del cliente
      await supabase.from('pedidos_catalogo').insert([
        {
          empresa_id: empresaId,
          nombre_cliente: nombreCliente.trim(),
          telefono_cliente: telefonoCliente.trim() || null,
          direccion_cliente:
            tipoEntrega === 'delivery'
              ? direccionCliente.trim()
              : 'Retiro en tienda',
          tipo_entrega: tipoEntrega,
          metodo_pago: metodoPago,
          productos: productosNormalizados,
          total: totalDolar,
          total_bs: totalBs,
          tasa_cambio: tasa,
          estado: 'pendiente',
        },
      ]);

      // ── Construir mensaje WhatsApp ────────────────────────
      const buildMensaje = (paraCliente = false) => {
        const titulo = paraCliente
          ? `✅ *Tu pedido en ${empresa.nombre.toUpperCase()} fue recibido*`
          : `🛒 *NUEVO PEDIDO - ${empresa.nombre.toUpperCase()}*`;

        let msg = `${titulo}%0A`;
        msg += `👤 *Cliente:* ${nombreCliente.toUpperCase()}%0A`;
        if (telefonoCliente) msg += `📞 *Teléfono:* ${telefonoCliente}%0A`;
        msg += `📦 *Entrega:* ${tipoEntrega === 'delivery' ? `Delivery → ${direccionCliente}` : 'Retiro en tienda'}%0A`;
        msg += `💳 *Pago:* ${metodoLabel}%0A%0A`;

        carrito.forEach((i) => {
          const subt = (i.precio * i.cant).toFixed(2);
          const subtBs = (i.precio * i.cant * tasa).toFixed(2);
          msg += `• ${i.cant}x ${i.nombre}${i.descripcion ? ` (${i.descripcion})` : ''} — $${subt} / Bs.${subtBs}%0A`;
        });

        msg += `%0A💵 *TOTAL USD:* *$${totalDolar.toFixed(2)}*%0A`;
        msg += `💴 *TOTAL Bs.:* *Bs.${totalBs.toFixed(2)}* _(Tasa: ${tasa.toFixed(2)})_%0A`;

        // Si el método es Pago Móvil, agregar datos de la empresa
        if (metodoPago === 'pago_movil' && empresa?.pago_movil_banco) {
          msg += `%0A📱 *Datos Pago Móvil:*%0A`;
          msg += `🏦 Banco: ${empresa.pago_movil_banco}%0A`;
          msg += `📞 Teléfono: ${empresa.pago_movil_telefono}%0A`;
          msg += `🪪 C.I./RIF: ${empresa.pago_movil_cedula}%0A`;
        }
        if (metodoPago === 'zelle' && empresa?.zelle_cuenta) {
          msg += `%0A⚡ *Zelle:* ${empresa.zelle_cuenta}%0A`;
        }
        if (metodoPago === 'transferencia' && empresa?.transferencia_banco) {
          msg += `%0A🏦 *Transferencia:*%0A`;
          msg += `Banco: ${empresa.transferencia_banco}%0A`;
          msg += `Cuenta: ${empresa.transferencia_cuenta}%0A`;
          msg += `Titular: ${empresa.transferencia_titular}%0A`;
        }

        if (!paraCliente) msg += `%0A_Enviado desde Ventiq_`;
        else msg += `%0A_Gracias por tu compra 🎉_`;

        return msg;
      };

      // 1. Enviar al número de la empresa
      window.open(
        `https://wa.me/${telefonoEmpresa}?text=${buildMensaje(false)}`,
        '_blank',
      );

      // 2. Si el cliente dio su teléfono, enviarle también su confirmación
      if (telefonoCliente.trim()) {
        const telCliente = telefonoCliente.replace(/\D/g, '');
        const telFull = telCliente.startsWith('58')
          ? telCliente
          : `58${telCliente.startsWith('0') ? telCliente.slice(1) : telCliente}`;
        setTimeout(() => {
          window.open(
            `https://wa.me/${telFull}?text=${buildMensaje(true)}`,
            '_blank',
          );
        }, 800);
      }

      setCarrito([]);
      setNombreCliente('');
      setTelefonoCliente('');
      setDireccionCliente('');
      setMetodoPago('efectivo_usd');
      setTipoEntrega('retiro');
      setIsCartOpen(false);
      setPedidoEnviado(true);
      setTimeout(() => setPedidoEnviado(false), 5000);
    } finally {
      setEnviando(false);
    }
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {/* CONFIRMACIÓN */}
      {pedidoEnviado && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm bg-emerald-600 text-white p-6 rounded-[2rem] shadow-2xl flex items-center gap-4">
          <CheckCircle2 size={40} className="flex-shrink-0" />
          <div>
            <p className="font-black uppercase text-xs tracking-widest">
              ¡Pedido Enviado!
            </p>
            <p className="text-[10px] opacity-90 font-bold">
              Revisa tu WhatsApp.
            </p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white px-6 py-10 rounded-b-[4rem] shadow-sm text-center mb-8 border-b border-slate-100">
        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] mx-auto mb-4 flex items-center justify-center overflow-hidden border border-slate-100">
          {empresa?.logo_url ? (
            <img
              src={empresa.logo_url}
              className="w-full h-full object-contain p-2"
              alt="Logo"
            />
          ) : (
            <Building2 className="text-slate-200" size={32} />
          )}
        </div>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">
          {empresa?.nombre}
        </h1>
        {empresa?.direccion && (
          <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center justify-center gap-1">
            <MapPin size={10} /> {empresa.direccion}
          </p>
        )}
        <div className="mt-4 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full inline-block border border-emerald-100 text-[9px] font-black uppercase">
          {tasa > 0
            ? `Tasa: ${moneda === 'EUR' ? '€' : 'Bs.'} ${tasa.toFixed(2)}`
            : 'Tasa no disponible'}
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="sticky top-6 z-40 px-6 mb-10 max-w-xl mx-auto">
        <div className="relative">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="¿Qué deseas pedir?"
            className="w-full bg-white/90 backdrop-blur-xl py-6 pl-14 pr-6 rounded-[2.2rem] shadow-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-orange-200 transition-all"
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </div>

      {/* CATEGORÍAS */}
      {categorias.length > 0 && (
        <div className="w-full overflow-x-auto no-scrollbar py-4 px-6 mb-4 flex gap-3 sticky top-[72px] bg-slate-50/80 backdrop-blur-md z-30">
          <button
            onClick={() => setCatSeleccionada('todas')}
            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
              catSeleccionada === 'todas'
                ? 'bg-[#1A1D23] text-[#FF9800] border-[#1A1D23] shadow-lg'
                : 'bg-white text-slate-400 border-white'
            }`}
          >
            Ver Todo
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCatSeleccionada(cat.id)}
              className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                catSeleccionada === cat.id
                  ? 'bg-[#1A1D23] text-[#FF9800] border-[#1A1D23]'
                  : 'bg-white text-slate-400 border-white'
              }`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      )}

      {/* GRID PRODUCTOS */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {productos
          .filter((p) => p.nombre.toLowerCase().includes(filtro.toLowerCase()))
          .map((p) => {
            const itemEnCarrito = carrito.find((i) => i.id === p.id);
            const cant = itemEnCarrito?.cant || 0;
            return (
              <div
                key={p.id}
                className={`bg-white p-5 rounded-[2.8rem] flex flex-row items-center gap-5 border-2 transition-all ${cant > 0 ? 'border-orange-500 shadow-xl' : 'border-transparent shadow-sm'}`}
              >
                <div className="relative w-24 h-24 flex-shrink-0">
                  <div className="w-full h-full bg-slate-100 rounded-3xl overflow-hidden border border-slate-50">
                    {p.imagen_url ? (
                      <ImagenConCarga url={p.imagen_url} nombre={p.nombre} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <Package size={30} />
                      </div>
                    )}
                  </div>
                  {cant > 0 && (
                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-4 border-white shadow-lg">
                      {cant}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 text-xs uppercase leading-tight mb-1 truncate">
                    {p.nombre}
                  </h3>
                  {p.descripcion && (
                    <p className="text-[10px] text-slate-400 font-medium leading-tight mb-2 line-clamp-1">
                      {p.descripcion}
                    </p>
                  )}
                  <p className="text-orange-500 font-black text-xl leading-none">
                    ${p.precio.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    ≈ {moneda === 'EUR' ? '€' : 'Bs.'}{' '}
                    {(p.precio * tasa).toFixed(2)}
                  </p>

                  <div className="mt-4 flex items-center gap-2">
                    {cant === 0 ? (
                      <button
                        onClick={() => agregarAlCarrito(p)}
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
                      >
                        <Plus size={14} /> Añadir
                      </button>
                    ) : (
                      <div className="flex items-center bg-slate-100 rounded-2xl p-1 gap-1">
                        <button
                          onClick={() =>
                            cant === 1
                              ? eliminarDelCarrito(p.id)
                              : actualizarCant(p.id, cant - 1)
                          }
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400"
                        >
                          {cant === 1 ? (
                            <Trash2 size={14} />
                          ) : (
                            <Minus size={14} />
                          )}
                        </button>
                        <input
                          type="number"
                          value={cant}
                          onChange={(e) =>
                            manejarInputCant(p.id, e.target.value)
                          }
                          onBlur={() => validarInputBlur(p.id, cant)}
                          className="w-10 bg-transparent text-center font-black text-xs text-slate-900 outline-none"
                        />
                        <button
                          onClick={() => actualizarCant(p.id, cant + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* VER MÁS */}
      {tieneMas && (
        <div className="flex justify-center mt-12 mb-24 px-6">
          <button
            onClick={() => obtenerProductos(empresaId)}
            disabled={cargandoMas}
            className="w-full max-w-xs py-5 bg-white border-2 border-slate-100 text-slate-500 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
          >
            {cargandoMas ? (
              <Loader2 size={16} className="animate-spin" />
            ) : null}
            {cargandoMas ? 'Cargando...' : 'Ver más productos'}
          </button>
        </div>
      )}

      {/* BOTÓN FLOTANTE CARRITO */}
      {carrito.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 px-6 z-50">
          <button
            onClick={() => setIsCartOpen(true)}
            className="max-w-md mx-auto w-full bg-[#1A1D23] text-white p-6 rounded-[2.8rem] shadow-2xl flex items-center justify-between active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="relative bg-orange-500 p-3 rounded-2xl">
                <ShoppingCart size={24} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-orange-400 uppercase leading-none mb-1">
                  Tu Carrito
                </p>
                <p className="text-lg font-black uppercase tracking-tighter leading-none">
                  {carrito.reduce((acc, i) => acc + i.cant, 0)} Items
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black">${totalDolar.toFixed(2)}</p>
              <p className="text-[10px] text-orange-300 font-bold">
                Bs. {totalBs.toFixed(2)}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* DRAWER CARRITO */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            {/* Header */}
            <div className="p-8 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="font-black uppercase text-2xl tracking-tighter">
                Mi Pedido
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-2xl"
              >
                <X size={24} />
              </button>
            </div>

            {/* Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Productos */}
              <div className="space-y-3">
                {carrito.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex items-center gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm"
                  >
                    <button
                      onClick={() => eliminarDelCarrito(item.id)}
                      className="absolute -top-1 -right-1 bg-red-50 text-red-500 p-2 rounded-full border border-red-100 shadow-sm"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0">
                      {item.imagen_url ? (
                        <img
                          src={item.imagen_url}
                          className="w-full h-full object-cover"
                          alt="item"
                        />
                      ) : (
                        <Package
                          size={18}
                          className="m-auto mt-4 text-slate-200"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[10px] uppercase text-slate-800 truncate pr-4">
                        {item.nombre}
                      </p>
                      <p className="text-orange-500 font-black text-sm">
                        ${(item.precio * item.cant).toFixed(2)}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold">
                        Bs. {(item.precio * item.cant * tasa).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center bg-slate-50 rounded-2xl p-1 gap-1 border">
                      <button
                        onClick={() => actualizarCant(item.id, item.cant - 1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-400"
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        value={item.cant}
                        onChange={(e) =>
                          manejarInputCant(item.id, e.target.value)
                        }
                        onBlur={() => validarInputBlur(item.id, item.cant)}
                        className="w-7 bg-transparent text-center font-black text-xs outline-none"
                      />
                      <button
                        onClick={() => actualizarCant(item.id, item.cant + 1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-400"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── DATOS DEL CLIENTE ── */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Tus Datos
                </p>
                <input
                  type="text"
                  placeholder="¿CUÁL ES TU NOMBRE? *"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-orange-500 font-black text-xs uppercase transition-all"
                />
                <div className="relative">
                  <Phone
                    size={14}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono (para confirmación)"
                    value={telefonoCliente}
                    onChange={(e) => setTelefonoCliente(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 pl-10 rounded-2xl outline-none focus:border-orange-500 font-bold text-xs transition-all"
                  />
                </div>
              </div>

              {/* ── TIPO DE ENTREGA ── */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Tipo de Entrega
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'retiro', label: 'Retiro en Tienda', icon: '🏪' },
                    { id: 'delivery', label: 'Delivery', icon: '🚗' },
                  ].map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setTipoEntrega(op.id as any)}
                      className={`p-3 rounded-2xl border-2 text-center font-black text-[10px] uppercase transition-all ${
                        tipoEntrega === op.id
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-100 bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span className="text-lg block mb-1">{op.icon}</span>
                      {op.label}
                    </button>
                  ))}
                </div>
                {tipoEntrega === 'delivery' && (
                  <div className="relative">
                    <MapPin
                      size={14}
                      className="absolute left-4 top-4 text-slate-400"
                    />
                    <textarea
                      placeholder="Dirección de entrega..."
                      value={direccionCliente}
                      onChange={(e) => setDireccionCliente(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 p-4 pl-10 rounded-2xl outline-none focus:border-orange-500 font-bold text-xs resize-none transition-all"
                      rows={2}
                    />
                  </div>
                )}
              </div>

              {/* ── MÉTODO DE PAGO ── */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Método de Pago
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {METODOS_PAGO.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMetodoPago(m.id)}
                      className={`p-3 rounded-2xl border-2 flex items-center gap-2 font-black text-[10px] uppercase transition-all ${
                        metodoPago === m.id
                          ? m.color + ' shadow-sm'
                          : 'border-slate-100 bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span>{m.icon}</span> {m.label}
                    </button>
                  ))}
                </div>

                {/* Mostrar datos de pago móvil si aplica */}
                {metodoPago === 'pago_movil' && empresa?.pago_movil_banco && (
                  <div className="p-4 bg-violet-50 border border-violet-200 rounded-2xl space-y-1">
                    <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest mb-2">
                      Datos Pago Móvil
                    </p>
                    <p className="text-xs font-bold text-violet-800">
                      🏦 {empresa.pago_movil_banco}
                    </p>
                    <p className="text-xs font-bold text-violet-800">
                      📞 {empresa.pago_movil_telefono}
                    </p>
                    <p className="text-xs font-bold text-violet-800">
                      🪪 {empresa.pago_movil_cedula}
                    </p>
                  </div>
                )}
                {metodoPago === 'zelle' && empresa?.zelle_cuenta && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl">
                    <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-1">
                      Zelle
                    </p>
                    <p className="text-xs font-bold text-purple-800">
                      ⚡ {empresa.zelle_cuenta}
                    </p>
                  </div>
                )}
                {metodoPago === 'transferencia' &&
                  empresa?.transferencia_banco && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">
                        Datos Transferencia
                      </p>
                      <p className="text-xs font-bold text-slate-800">
                        🏦 {empresa.transferencia_banco}
                      </p>
                      <p className="text-xs font-bold text-slate-800">
                        💳 {empresa.transferencia_cuenta}
                      </p>
                      <p className="text-xs font-bold text-slate-800">
                        👤 {empresa.transferencia_titular}
                      </p>
                    </div>
                  )}
              </div>

              {/* Totales */}
              <div className="p-4 bg-slate-900 rounded-2xl flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase">
                  Total a Pagar
                </p>
                <div className="text-right">
                  <p className="font-black text-white text-2xl">
                    ${totalDolar.toFixed(2)}
                  </p>
                  <p className="text-[10px] font-bold text-orange-400">
                    Bs. {totalBs.toFixed(2)}
                  </p>
                  <p className="text-[8px] font-bold text-slate-500">
                    Tasa: {tasa.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer fijo */}
            <div className="p-6 border-t bg-slate-50/50 flex-shrink-0">
              <button
                onClick={enviarPedido}
                disabled={!nombreCliente.trim() || enviando}
                className={`w-full py-5 rounded-[2.2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all ${
                  nombreCliente.trim() && !enviando
                    ? 'bg-[#25D366] text-white hover:brightness-105 active:scale-[0.98]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {enviando ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <MessageCircle size={22} strokeWidth={3} />
                )}
                {enviando
                  ? 'Enviando...'
                  : !empresa?.telefono
                    ? 'WhatsApp no configurado'
                    : nombreCliente.trim()
                      ? 'Confirmar Pedido por WhatsApp'
                      : 'Escribe tu nombre primero'}
              </button>
              {telefonoCliente.trim() && (
                <p className="text-[9px] text-center text-slate-400 font-bold mt-2">
                  📱 También recibirás confirmación en {telefonoCliente}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
