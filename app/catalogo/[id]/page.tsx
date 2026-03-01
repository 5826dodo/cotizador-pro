'use client';
import { useEffect, useState, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  ShoppingCart,
  Search,
  MessageCircle,
  Building2,
  Package,
  AlertCircle,
  X,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

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

  const eliminarDelCarrito = (id: string) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    const cargarTodo = async () => {
      try {
        if (!empresaId) return;
        const { data: emp } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', empresaId)
          .single();
        setEmpresa(emp);
        const { data: prods } = await supabase
          .from('productos')
          .select('*')
          .eq('empresa_id', empresaId)
          .gt('stock', 0);
        setProductos(prods || []);
        const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        const d = await res.json();
        setTasa(d.promedio || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    cargarTodo();
  }, [empresaId]);

  useEffect(() => {
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'none';
    return () => {
      if (nav) nav.style.display = 'flex';
    };
  }, []);

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
      // Permitir temporalmente el campo vacío mientras el usuario borra
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
    let mensaje = `*NUEVO PEDIDO - ${empresa.nombre.toUpperCase()}*%0A%0A`;
    carrito.forEach((i) => {
      mensaje += `• ${i.cant}x ${i.nombre} ($${(i.precio * i.cant).toFixed(2)})%0A`;
    });
    mensaje += `%0A*TOTAL:* *$${totalDolar.toFixed(2)}*%0A*Bs. ${(totalDolar * tasa).toFixed(2)}*%0A%0A_Enviado desde Ventiq_`;

    window.open(
      `https://wa.me/${empresa.telefono?.replace(/\D/g, '')}?text=${mensaje}`,
      '_blank',
    );

    // Acciones Post-Envío
    setCarrito([]);
    setIsCartOpen(false);
    setPedidoEnviado(true);
    setTimeout(() => setPedidoEnviado(false), 5000);
  };

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white italic">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {/* MENSAJE DE ÉXITO FLOTANTE */}
      {pedidoEnviado && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm bg-emerald-600 text-white p-6 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in fade-in zoom-in slide-in-from-top-10 duration-500">
          <CheckCircle2 size={40} className="flex-shrink-0" />
          <div>
            <p className="font-black uppercase text-xs tracking-widest">
              ¡Pedido Enviado!
            </p>
            <p className="text-[10px] opacity-90 font-bold">
              Hemos vaciado tu carrito. Revisa tu WhatsApp para finalizar.
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
            />
          ) : (
            <Building2 className="text-slate-200" size={32} />
          )}
        </div>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">
          {empresa?.nombre}
        </h1>
        <div className="mt-4 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full inline-block border border-emerald-100 text-[9px] font-black uppercase">
          Tasa: Bs. {tasa.toFixed(2)}
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
                className={`bg-white p-5 rounded-[2.8rem] flex flex-row items-center gap-5 border-2 transition-all duration-300 ${cant > 0 ? 'border-orange-500 shadow-xl shadow-orange-50' : 'border-transparent shadow-sm'}`}
              >
                <div className="relative w-24 h-24 flex-shrink-0">
                  <div className="w-full h-full bg-slate-100 rounded-3xl overflow-hidden border border-slate-50 relative">
                    {/* Placeholder mientras carga */}
                    <div className="absolute inset-0 flex items-center justify-center text-slate-300 animate-pulse">
                      <Package size={24} />
                    </div>

                    {p.imagen_url ? (
                      <img
                        src={p.imagen_url}
                        alt={p.nombre}
                        loading="lazy" // <--- LA MAGIA: El navegador gestiona la carga
                        decoding="async" // <--- Optimiza el renderizado
                        className="w-full h-full object-cover relative z-10 transition-opacity duration-500 opacity-0"
                        onLoad={(e) => (e.currentTarget.style.opacity = '1')} // Aparece suavemente al cargar
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200 bg-slate-50">
                        <Package size={30} />
                      </div>
                    )}
                  </div>

                  {/* Badge de cantidad (se mantiene igual) */}
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
                  <p className="text-orange-500 font-black text-xl leading-none">
                    ${p.precio.toFixed(2)}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    {cant === 0 ? (
                      <button
                        onClick={() => agregarAlCarrito(p)}
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest"
                      >
                        <Plus size={14} /> Añadir
                      </button>
                    ) : (
                      <div className="flex items-center bg-slate-100 rounded-2xl p-1 gap-1 animate-in slide-in-from-left-2">
                        <button
                          onClick={() => {
                            if (cant === 1) eliminarDelCarrito(p.id);
                            else actualizarCant(p.id, cant - 1);
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-red-500 transition-colors"
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
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-emerald-500"
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

      {/* BOTÓN FLOTANTE */}
      {carrito.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 px-6 z-50">
          <button
            onClick={() => setIsCartOpen(true)}
            className="max-w-md mx-auto w-full bg-[#1A1D23] text-white p-6 rounded-[2.8rem] shadow-2xl flex items-center justify-between border-t border-white/10 active:scale-95 transition-transform"
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
              {/* Dentro del mapeo del carrito en el Drawer */}
              {carrito.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex items-center gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm"
                >
                  {/* Botón de eliminar absoluto (fácil de tocar) */}
                  <button
                    onClick={() => eliminarDelCarrito(item.id)}
                    className="absolute -top-1 -right-1 bg-red-50 text-red-500 p-2 rounded-full border border-red-100 shadow-sm opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>

                  <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0">
                    {item.imagen_url ? (
                      <img
                        src={item.imagen_url}
                        className="w-full h-full object-cover"
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

                  {/* Controles de cantidad */}
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
              <div className="flex items-center justify-between">
                <p className="font-black text-slate-900 text-3xl tracking-tighter">
                  ${totalDolar.toFixed(2)}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border">
                  Bs. {(totalDolar * tasa).toFixed(2)}
                </p>
              </div>
              <button
                onClick={enviarPedido}
                className="w-full bg-[#25D366] text-white py-6 rounded-[2.2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl hover:brightness-105 active:scale-[0.98] transition-all"
              >
                <MessageCircle size={22} strokeWidth={3} /> Enviar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
