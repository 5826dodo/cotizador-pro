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
  ChevronRight,
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

  // Bloqueador de Navbar
  useEffect(() => {
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'none';
    return () => {
      if (nav) nav.style.display = 'flex';
    };
  }, []);

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
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      {/* HEADER PC & MÓVIL */}
      <div className="bg-white px-6 py-12 rounded-b-[4rem] shadow-sm border-b border-slate-100 text-center mb-10">
        <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] mx-auto mb-4 flex items-center justify-center overflow-hidden border-2 border-slate-100 p-2">
          {empresa?.logo_url ? (
            <img
              src={empresa.logo_url}
              className="w-full h-full object-contain"
            />
          ) : (
            <Building2 className="text-slate-200" size={40} />
          )}
        </div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">
          {empresa?.nombre}
        </h1>
        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-[0.3em]">
          Catálogo Digital
        </p>

        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full mt-6 border border-emerald-100">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black uppercase">
            Tasa: Bs. {tasa.toFixed(2)}
          </span>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="max-w-xl mx-auto px-6 mb-12">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
          <input
            type="text"
            placeholder="¿Qué estás buscando?"
            className="w-full bg-white py-6 pl-14 pr-6 rounded-[2rem] shadow-xl outline-none font-bold text-sm border-2 border-transparent focus:border-orange-100 transition-all"
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </div>

      {/* GRILLA RESPONSIVA: 1 col móvil, 2 tablet, 3 PC */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {productos
          .filter((p) => p.nombre.toLowerCase().includes(filtro.toLowerCase()))
          .map((p) => (
            <div
              key={p.id}
              className="bg-white p-5 rounded-[2.5rem] flex flex-row sm:flex-col items-center gap-5 border border-white hover:border-orange-200 hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="w-24 h-24 sm:w-full sm:h-52 bg-slate-50 rounded-[2rem] overflow-hidden flex-shrink-0">
                {p.imagen_url ? (
                  <img
                    src={p.imagen_url}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                    <Package size={48} />
                  </div>
                )}
              </div>

              <div className="flex-1 w-full flex flex-col justify-between h-full">
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase leading-tight line-clamp-2 mb-1">
                    {p.nombre}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-orange-500">
                      ${p.precio.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Bs. {(p.precio * tasa).toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={() => agregarAlCarrito(p)}
                  className="mt-4 w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-500 transition-colors"
                >
                  <ShoppingCart size={14} /> Agregar
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* FOOTER CARRITO (ANCHO CONTROLADO EN PC) */}
      {carrito.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 px-6 z-[100]">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => {
                const totalDolar = carrito.reduce(
                  (acc, p) => acc + p.precio * p.cant,
                  0,
                );
                const msg = `*PEDIDO:*%0A${carrito.map((i) => `• ${i.cant}x ${i.nombre}`).join('%0A')}%0A%0A*TOTAL: $${totalDolar.toFixed(2)}*`;
                window.open(
                  `https://wa.me/${empresa.telefono}?text=${msg}`,
                  '_blank',
                );
              }}
              className="w-full bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex items-center justify-between border-2 border-white/10 group active:scale-95 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-3 rounded-2xl group-hover:rotate-12 transition-transform">
                  <MessageCircle size={24} />
                </div>
                <div className="text-left leading-none">
                  <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">
                    Enviar Pedido
                  </p>
                  <p className="text-lg font-black">
                    {carrito.length} Productos
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black tracking-tighter">
                  $
                  {carrito
                    .reduce((acc, p) => acc + p.precio * p.cant, 0)
                    .toFixed(2)}
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
