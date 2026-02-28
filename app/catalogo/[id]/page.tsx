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

  // LÓGICA DEL CARRITO MEJORADA
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

  const totalDolar = carrito.reduce((acc, p) => acc + p.precio * p.cant, 0);

  const enviarPedido = () => {
    let mensaje = `*NUEVO PEDIDO - ${empresa.nombre.toUpperCase()}*%0A%0A`;
    carrito.forEach((i) => {
      mensaje += `• ${i.cant}x ${i.nombre} ($${(i.precio * i.cant).toFixed(2)})%0A`;
    });
    mensaje += `%0A*TOTAL A PAGAR:*%0A💵 *$${totalDolar.toFixed(2)}*%0A🇻🇪 *Bs. ${(totalDolar * tasa).toFixed(2)}*%0A%0A_Enviado desde Ventiq_`;
    window.open(`https://wa.me/${empresa.telefono}?text=${mensaje}`, '_blank');
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
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* HEADER */}
      <div className="bg-white px-6 py-10 rounded-b-[3.5rem] shadow-sm text-center mb-8 border-b border-slate-100">
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
        <div className="flex justify-center gap-2 mt-4">
          <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[9px] font-black uppercase tracking-widest">
            Tasa: Bs. {tasa.toFixed(2)}
          </div>
        </div>
      </div>

      {/* BUSCADOR STICKY */}
      <div className="sticky top-4 z-40 px-6 mb-8">
        <div className="relative max-w-xl mx-auto group">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar productos..."
            className="w-full bg-white/80 backdrop-blur-xl py-5 pl-14 pr-6 rounded-3xl shadow-xl outline-none font-bold text-sm border-2 border-transparent focus:border-orange-200 transition-all"
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </div>

      {/* PRODUCTOS */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {productos
          .filter((p) => p.nombre.toLowerCase().includes(filtro.toLowerCase()))
          .map((p) => (
            <div
              key={p.id}
              className="bg-white p-4 rounded-[2.5rem] flex items-center gap-4 border border-white hover:border-orange-100 hover:shadow-xl transition-all group"
            >
              <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0">
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
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-800 text-xs uppercase truncate">
                  {p.nombre}
                </h3>
                <p className="text-orange-500 font-black text-lg leading-none mt-1">
                  ${p.precio.toFixed(2)}
                </p>
                <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">
                  Ref: Bs. {(p.precio * tasa).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => agregarAlCarrito(p)}
                className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center active:scale-90 hover:bg-orange-500 transition-all shadow-lg"
              >
                <Plus size={20} />
              </button>
            </div>
          ))}
      </div>

      {/* BOTÓN FLOTANTE CARRITO */}
      {carrito.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-6 z-50 animate-in slide-in-from-bottom-5">
          <button
            onClick={() => setIsCartOpen(true)}
            className="max-w-md mx-auto w-full bg-slate-900 text-white p-5 rounded-[2.5rem] shadow-2xl flex items-center justify-between border-2 border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">
                  {carrito.reduce((acc, i) => acc + i.cant, 0)}
                </span>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none">
                  Ver Pedido
                </p>
                <p className="text-sm font-black uppercase tracking-tighter">
                  Mi Carrito
                </p>
              </div>
            </div>
            <p className="text-xl font-black">${totalDolar.toFixed(2)}</p>
          </button>
        </div>
      )}

      {/* DRAWER DEL CARRITO (SIDEBAR MODAL) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header Drawer */}
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <h2 className="font-black uppercase text-lg tracking-tighter">
                Tu Pedido
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 bg-white rounded-xl shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Lista Drawer */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {carrito.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100"
                >
                  <div className="w-14 h-14 bg-white rounded-xl flex-shrink-0 overflow-hidden border border-slate-200">
                    {item.imagen_url ? (
                      <img
                        src={item.imagen_url}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package
                        size={20}
                        className="m-auto mt-4 text-slate-200"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[10px] uppercase truncate">
                      {item.nombre}
                    </p>
                    <p className="text-orange-500 font-black text-sm">
                      ${(item.precio * item.cant).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-slate-100">
                    <button
                      onClick={() => actualizarCant(item.id, -1)}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="px-3 font-black text-xs">{item.cant}</span>
                    <button
                      onClick={() => actualizarCant(item.id, 1)}
                      className="p-1 text-slate-400 hover:text-emerald-500"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Drawer */}
            <div className="p-8 border-t bg-white space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                  Total Estimado
                </p>
                <div className="text-right">
                  <p className="text-3xl font-black text-slate-900 leading-none">
                    ${totalDolar.toFixed(2)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                    Bs. {(totalDolar * tasa).toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={enviarPedido}
                className="w-full bg-[#25D366] text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl hover:brightness-110 active:scale-95 transition-all"
              >
                <MessageCircle size={20} strokeWidth={3} />
                Enviar a WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
