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
} from 'lucide-react';

function ImagenConCarga({ url, nombre }: { url: string; nombre: string }) {
  const [cargada, setCargada] = useState(false);

  return (
    <div className="relative w-full h-full">
      {/* SKELETON: Fondo gris que pulsa mientras carga */}
      {!cargada && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse" />
      )}

      <img
        src={url}
        alt={nombre}
        loading="lazy"
        decoding="async"
        onLoad={() => setCargada(true)} // Se dispara cuando la imagen termina de bajar
        className={`w-full h-full object-cover transition-all duration-700 ease-in-out ${
          cargada ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
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
  const [categorias, setCategorias] = useState<any[]>([]);
  const [catSeleccionada, setCatSeleccionada] = useState('todas');

  const [nombreCliente, setNombreCliente] = useState('');

  const [pagina, setPagina] = useState(0);
  const [tieneMas, setTieneMas] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const ITEMS_POR_PAGINA = 12;

  // --- EFECTO AGRESIVO PARA OCULTAR NAVBAR ---
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'hide-navbar-forced';
    style.innerHTML = `
      nav, header, aside, [role="navigation"] { display: none !important; opacity: 0 !important; pointer-events: none !important; }
      body { padding-top: 0 !important; }
    `;
    document.head.appendChild(style);

    return () => {
      const el = document.getElementById('hide-navbar-forced');
      if (el) el.remove();
    };
  }, []);

  // NUEVA FUNCIÓN PARA TRAER PRODUCTOS
  const obtenerProductos = async (idEmpresa: string, reiniciar = false) => {
    try {
      const nuevaPagina = reiniciar ? 0 : pagina;
      if (!reiniciar) setCargandoMas(true);

      const desde = nuevaPagina * ITEMS_POR_PAGINA;
      const hasta = desde + ITEMS_POR_PAGINA - 1;

      let query = supabase
        .from('productos')
        .select('*')
        .eq('empresa_id', idEmpresa)
        .eq('activo', true)
        .gt('stock', 0)
        .order('nombre', { ascending: true })
        .range(desde, hasta);

      if (catSeleccionada !== 'todas') {
        query = query.eq('categoria_id', catSeleccionada);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (reiniciar) {
        setProductos(data || []);
        setPagina(1);
        setTieneMas(data?.length === ITEMS_POR_PAGINA);
      } else {
        setProductos((prev) => [...prev, ...(data || [])]);
        setPagina(nuevaPagina + 1);
        setTieneMas(data?.length === ITEMS_POR_PAGINA);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoMas(false);
    }
  };

  // 1. Añade este estado arriba con los demás
  const [moneda, setMoneda] = useState('BS');

  // 2. Actualiza el useEffect de carga inicial
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

        // --- DETECTAR MONEDA CONFIGURADA ---
        const monedaConfig = emp?.moneda_secundaria || 'BS';
        setMoneda(monedaConfig);

        // --- ELEGIR API SEGÚN MONEDA ---
        const urlTasa =
          monedaConfig === 'EUR'
            ? 'https://ve.dolarapi.com/v1/euro/oficial'
            : 'https://ve.dolarapi.com/v1/dolares/oficial';

        const res = await fetch(urlTasa);
        const d = await res.json();
        setTasa(d.promedio || 0);

        const { data: cats } = await supabase
          .from('categorias')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('nombre');
        setCategorias(cats || []);

        await obtenerProductos(empresaId, true);
      } finally {
        setLoading(false);
      }
    };
    cargarDatosBase();
  }, [empresaId]);

  // NUEVO EFFECT PARA CAMBIO DE CATEGORÍA
  useEffect(() => {
    if (empresaId && !loading) {
      obtenerProductos(empresaId, true);
    }
  }, [catSeleccionada]);

  // --- LÓGICA DE CARRITO ---
  const agregarAlCarrito = (p: any) => {
    setCarrito((prev) => {
      const ex = prev.find((i) => i.id === p.id);
      if (ex)
        return prev.map((i) =>
          i.id === p.id ? { ...i, cant: i.cant + 1 } : i,
        );
      return [...prev, { ...p, cant: 1 }];
    });
  };

  const eliminarDelCarrito = (id: string) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const actualizarCant = (id: string, nuevaCant: number) => {
    setCarrito(
      (prev) =>
        prev
          .map((item) => {
            if (item.id === id) {
              if (nuevaCant <= 0) return null;
              return { ...item, cant: nuevaCant };
            }
            return item;
          })
          .filter(Boolean) as any[],
    );
  };

  const manejarInputCant = (id: string, valor: string) => {
    const num = parseInt(valor);
    if (!isNaN(num)) {
      actualizarCant(id, num);
    } else if (valor === '') {
      setCarrito((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, cant: '' as any } : item,
        ),
      );
    }
  };

  const validarInputBlur = (id: string, cantActual: any) => {
    if (cantActual === '' || isNaN(cantActual) || cantActual < 1) {
      actualizarCant(id, 1);
    }
  };

  const totalDolar = carrito.reduce((acc, p) => acc + p.precio * p.cant, 0);

  const enviarPedido = () => {
    if (!nombreCliente.trim()) {
      alert('Por favor, ingresa tu nombre para completar el pedido.');
      return;
    }

    // VALIDACIÓN DE TELÉFONO
    const telefonoLimpio = empresa?.telefono?.replace(/\D/g, '');

    if (!telefonoLimpio || telefonoLimpio.length < 7) {
      alert(
        '⚠️ Esta empresa aún no ha configurado un número de WhatsApp de atención. Por favor, contacta al administrador.',
      );
      return;
    }

    let mensaje = `*NUEVO PEDIDO - ${empresa.nombre.toUpperCase()}*%0A`;
    mensaje += `*Cliente:* ${nombreCliente.toUpperCase()}%0A%0A`;

    carrito.forEach((i) => {
      const desc = i.descripcion ? ` (${i.descripcion})` : '';
      mensaje += `• ${i.cant}x ${i.nombre}${desc} - $${(i.precio * i.cant).toFixed(2)}%0A`;
    });

    mensaje += `%0A*TOTAL:* *$${totalDolar.toFixed(2)}*%0A*${moneda === 'EUR' ? '€' : 'Bs.'} ${(totalDolar * tasa).toFixed(2)}*%0A%0A_Enviado desde Ventiq_`;
    // Construcción de URL con el teléfono validado
    const url = `https://wa.me/${telefonoLimpio}?text=${mensaje}`;
    window.open(url, '_blank');

    // Limpiar carrito
    setCarrito([]);
    setNombreCliente('');
    setIsCartOpen(false);
    setPedidoEnviado(true);
    setTimeout(() => setPedidoEnviado(false), 5000);
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-white italic">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {/* MENSAJE DE ÉXITO */}
      {pedidoEnviado && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm bg-emerald-600 text-white p-6 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in fade-in zoom-in slide-in-from-top-10 duration-500">
          <CheckCircle2 size={40} className="flex-shrink-0" />
          <div>
            <p className="font-black uppercase text-xs tracking-widest">
              ¡Pedido Enviado!
            </p>
            <p className="text-[10px] opacity-90 font-bold">
              Hemos vaciado tu carrito. Revisa tu WhatsApp.
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
          .filter((p) => {
            const matchBusqueda = p.nombre
              .toLowerCase()
              .includes(filtro.toLowerCase());
            const matchCategoria = true;
            return matchBusqueda && matchCategoria;
          })
          .map((p) => {
            const itemEnCarrito = carrito.find((i) => i.id === p.id);
            const cant = itemEnCarrito?.cant || 0;
            return (
              <div
                key={p.id}
                className={`bg-white p-5 rounded-[2.8rem] flex flex-row items-center gap-5 border-2 transition-all ${cant > 0 ? 'border-orange-500 shadow-xl' : 'border-transparent shadow-sm'}`}
              >
                <div className="relative w-24 h-24 flex-shrink-0">
                  <div className="w-full h-full bg-slate-100 rounded-3xl overflow-hidden border border-slate-50 relative">
                    {p.imagen_url ? (
                      <ImagenConCarga url={p.imagen_url} nombre={p.nombre} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <Package size={30} />
                      </div>
                    )}
                  </div>
                  {cant > 0 && (
                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-4 border-white shadow-lg animate-in zoom-in">
                      {cant}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 text-xs uppercase leading-tight mb-1 truncate">
                    {p.nombre}
                  </h3>
                  {/* NUEVO: Mostrar descripción/talla si existe */}
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
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
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
      {/* PEGAR JUSTO AQUÍ ABAJO DEL GRID */}
      {tieneMas && (
        <div className="flex justify-center mt-12 mb-24 px-6">
          <button
            onClick={() => obtenerProductos(empresaId)}
            disabled={cargandoMas}
            className="w-full max-w-xs py-5 bg-white border-2 border-slate-100 text-slate-500 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
          >
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
            <p className="text-2xl font-black">${totalDolar.toFixed(2)}</p>
          </button>
        </div>
      )}

      {/* DRAWER DEL CARRITO */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            <div className="p-8 border-b flex items-center justify-between">
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
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              {carrito.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex items-center gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm"
                >
                  <button
                    onClick={() => eliminarDelCarrito(item.id)}
                    className="absolute -top-1 -right-1 bg-red-50 text-red-500 p-2 rounded-full border border-red-100 shadow-sm opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0">
                    {item.imagen_url ? (
                      <img
                        src={item.imagen_url}
                        className="w-full h-full object-cover"
                        alt="item"
                      />
                    ) : (
                      <Package
                        size={20}
                        className="m-auto mt-5 text-slate-200"
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
                  </div>
                  <div className="flex items-center bg-slate-50 rounded-2xl p-1 gap-1 border">
                    <button
                      onClick={() => actualizarCant(item.id, item.cant - 1)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      value={item.cant}
                      onChange={(e) =>
                        manejarInputCant(item.id, e.target.value)
                      }
                      onBlur={() => validarInputBlur(item.id, item.cant)}
                      className="w-8 bg-transparent text-center font-black text-xs outline-none"
                    />
                    <button
                      onClick={() => actualizarCant(item.id, item.cant + 1)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-8 border-t bg-slate-50/50 space-y-6">
              {/* CAMPO DE NOMBRE DEL CLIENTE */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">
                  Tus Datos
                </p>
                <input
                  type="text"
                  placeholder="¿CUÁL ES TU NOMBRE?"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  className="w-full bg-white border-2 border-slate-100 p-5 rounded-3xl outline-none focus:border-orange-500 font-black text-xs uppercase transition-all shadow-sm"
                />
              </div>

              {/* RESUMEN DE TOTALES */}
              <div className="flex items-center justify-between px-2">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                    Total a Pagar
                  </p>
                  <p className="font-black text-slate-900 text-3xl tracking-tighter">
                    ${totalDolar.toFixed(2)}
                  </p>
                </div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  {moneda === 'EUR' ? '€' : 'Bs.'}{' '}
                  {(totalDolar * tasa).toFixed(2)}
                </p>
              </div>

              {/* BOTÓN WHATSAPP MEJORADO */}
              <button
                onClick={enviarPedido}
                disabled={!nombreCliente.trim()}
                className={`w-full py-6 rounded-[2.2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all ${
                  nombreCliente.trim()
                    ? 'bg-[#25D366] text-white hover:brightness-105 active:scale-[0.98]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <MessageCircle size={22} strokeWidth={3} />
                {!empresa?.telefono
                  ? 'WhatsApp no configurado' // <--- Alerta visual previa
                  : nombreCliente.trim()
                    ? 'Enviar a WhatsApp'
                    : 'Escribe tu nombre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
