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
  const [error, setError] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const cargarTodo = async () => {
      try {
        if (!empresaId) return;
        const { data: emp, error: empErr } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', empresaId)
          .single();
        if (empErr) throw empErr;
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
      } catch (err: any) {
        setError(err.message);
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

  // --- LÓGICA DEL CARRITO CENTRALIZADA ---
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

  const actualizarCant = (id: string, delta: number) => {
    setCarrito(
      (prev) =>
        prev
          .map((item) => {
            if (item.id === id) {
              const nuevaCant = Math.max(0, item.cant + delta);
              return nuevaCant === 0 ? null : { ...item, cant: nuevaCant };
            }
            return item;
          })
          .filter(Boolean) as any[],
    );
  };

  const eliminarDelCarrito = (id: string) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const obtenerCantEnCarrito = (id: string) => {
    return carrito.find((item) => item.id === id)?.cant || 0;
  };

  const totalDolar = carrito.reduce((acc, p) => acc + p.precio * p.cant, 0);

  const enviarPedido = () => {
    let mensaje = `*NUEVO PEDIDO - ${empresa.nombre.toUpperCase()}*%0A%0A`;
    carrito.forEach((i) => {
      mensaje += `• ${i.cant}x ${i.nombre} ($${(i.precio * i.cant).toFixed(2)})%0A`;
    });
    mensaje += `%0A*TOTAL A PAGAR:*%0A💵 *$${totalDolar.toFixed(2)}*%0A🇻🇪 *Bs. ${(totalDolar * tasa).toFixed(2)}*%0A%0A_Enviado desde Ventiq_`;
    window.open(
      `https://wa.me/${empresa.telefono?.replace(/\D/g, '')}?text=${mensaje}`,
      '_blank',
    );
  };

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-orange-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Preparando vitrina...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 font-sans">
      {/* HEADER TIPO BANNER */}
      <div className="bg-white px-6 pt-12 pb-16 rounded-b-[4rem] shadow-sm text-center mb-8 border-b border-slate-100 relative overflow-hidden">
        <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] mx-auto mb-4 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl relative z-10">
          {empresa?.logo_url ? (
            <img
              src={empresa.logo_url}
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <Building2 className="text-slate-200" size={32} />
          )}
        </div>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none relative z-10">
          {empresa?.nombre}
        </h1>
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full mt-4 border border-emerald-100 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-widest">
            Tasa: Bs. {tasa.toFixed(2)}
          </span>
        </div>
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 animate-pulse"></div>
      </div>

      {/* BUSCADOR */}
      <div className="sticky top-6 z-40 px-6 mb-10">
        <div className="relative max-w-xl mx-auto">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="¿Qué te provoca hoy?"
            className="w-full bg-white/90 backdrop-blur-xl py-6 pl-14 pr-6 rounded-[2.2rem] shadow-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-orange-200 transition-all placeholder:text-slate-300"
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </div>

      {/* LISTA DE PRODUCTOS */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {productos
          .filter((p) => p.nombre.toLowerCase().includes(filtro.toLowerCase()))
          .map((p) => {
            const cant = obtenerCantEnCarrito(p.id);
            return (
              <div
                key={p.id}
                className={`bg-white p-5 rounded-[2.8rem] flex flex-row items-center gap-5 border-2 transition-all duration-300 ${cant > 0 ? 'border-orange-500 shadow-orange-100 shadow-xl' : 'border-transparent shadow-sm'}`}
              >
                {/* Imagen con badge de cantidad */}
                <div className="relative w-24 h-24 flex-shrink-0">
                  <div className="w-full h-full bg-slate-50 rounded-3xl overflow-hidden border border-slate-50">
                    {p.imagen_url ? (
                      <img
                        src={p.imagen_url}
                        className="w-full h-full object-cover"
                      />
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
                  <h3 className="font-black text-slate-800 text-xs uppercase leading-tight mb-1">
                    {p.nombre}
                  </h3>
                  <p className="text-orange-500 font-black text-xl leading-none">
                    ${p.precio.toFixed(2)}
                  </p>

                  {/* CONTROLES DE CANTIDAD EN LA CARD */}
                  <div className="mt-3 flex items-center gap-2">
                    {cant === 0 ? (
                      <button
                        onClick={() => agregarAlCarrito(p)}
                        className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl flex items-center gap-2 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest shadow-md"
                      >
                        <Plus size={14} /> Añadir
                      </button>
                    ) : (
                      <div className="flex items-center bg-slate-100 rounded-2xl p-1 gap-1 animate-in slide-in-from-left-2">
                        <button
                          onClick={() => actualizarCant(p.id, -1)}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 hover:text-red-500 transition-colors"
                        >
                          {cant === 1 ? (
                            <Trash2 size={14} />
                          ) : (
                            <Minus size={14} />
                          )}
                        </button>
                        <span className="w-6 text-center font-black text-xs text-slate-900">
                          {cant}
                        </span>
                        <button
                          onClick={() => actualizarCant(p.id, 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 hover:text-emerald-500 transition-colors"
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

      {/* BOTÓN FLOTANTE CARRITO */}
      {carrito.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 px-6 z-50 animate-in slide-in-from-bottom-10 duration-500">
          <button
            onClick={() => setIsCartOpen(true)}
            className="max-w-md mx-auto w-full bg-[#1A1D23] text-white p-6 rounded-[2.8rem] shadow-[0_25px_50px_rgba(0,0,0,0.4)] flex items-center justify-between border-t border-white/10 hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="relative bg-orange-500 p-3 rounded-2xl">
                <ShoppingCart size={24} strokeWidth={2.5} />
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
              <p className="text-2xl font-black leading-none">
                ${totalDolar.toFixed(2)}
              </p>
              <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">
                Ver pedido
              </p>
            </div>
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
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out">
            <div className="p-8 border-b flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="font-black uppercase text-2xl tracking-tighter text-slate-900 leading-none">
                  Mi Pedido
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Resumen de compra
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-90 transition-all"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-5">
              {carrito.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-5 bg-white p-2 rounded-[2rem] animate-in slide-in-from-bottom-2"
                >
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex-shrink-0 overflow-hidden border border-slate-100">
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
                    <p className="font-black text-xs uppercase text-slate-800 leading-tight">
                      {item.nombre}
                    </p>
                    <p className="text-orange-500 font-black text-sm mt-0.5">
                      ${(item.precio * item.cant).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center bg-slate-50 rounded-2xl p-1 gap-1 border border-slate-100 shadow-inner">
                    <button
                      onClick={() => actualizarCant(item.id, -1)}
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-red-500"
                    >
                      {item.cant === 1 ? (
                        <Trash2 size={14} />
                      ) : (
                        <Minus size={14} />
                      )}
                    </button>
                    <span className="w-6 text-center font-black text-xs text-slate-900">
                      {item.cant}
                    </span>
                    <button
                      onClick={() => actualizarCant(item.id, 1)}
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-emerald-500"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {carrito.length === 0 && (
                <div className="text-center py-20 opacity-20">
                  <ShoppingCart size={60} className="mx-auto mb-4" />
                  <p className="font-black uppercase tracking-widest text-xs">
                    Tu carrito está vacío
                  </p>
                </div>
              )}
            </div>

            <div className="p-8 border-t bg-slate-50/50 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-slate-900 text-3xl leading-none tracking-tighter">
                    ${totalDolar.toFixed(2)}
                  </p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Total en Bs. {(totalDolar * tasa).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    Checkout Seguro
                  </p>
                </div>
              </div>

              <button
                onClick={enviarPedido}
                disabled={carrito.length === 0}
                className="w-full bg-[#25D366] text-white py-6 rounded-[2.2rem] font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 hover:brightness-105 active:scale-[0.98] transition-all disabled:grayscale disabled:opacity-50"
              >
                <MessageCircle size={22} strokeWidth={3} />
                Confirmar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
