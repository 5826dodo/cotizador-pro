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
} from 'lucide-react';

export default function CatalogoPublico({
  params,
}: {
  params: Promise<{ id: string }>; // Definido como Promesa
}) {
  // Desenvuelve los params correctamente para Next.js 14/15
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
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // 1. Validar que el ID existe
        if (!empresaId) throw new Error('ID de empresa no proporcionado');

        // 2. Obtener Empresa
        const { data: emp, error: empError } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', empresaId)
          .single();

        if (empError || !emp)
          throw new Error('Empresa no encontrada en la base de datos');
        setEmpresa(emp);

        // 3. Obtener Productos
        const { data: prod, error: prodError } = await supabase
          .from('productos')
          .select('*')
          .eq('empresa_id', empresaId)
          .gt('stock', 0); // Solo productos con existencia

        if (prodError) console.error('Error productos:', prodError);
        setProductos(prod || []);

        // 4. Obtener Tasa Dolar/Euro
        try {
          const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
          const data = await res.json();

          if (emp.moneda_secundaria === 'EUR') {
            const resEuro = await fetch(
              'https://ve.dolarapi.com/v1/euros/oficial',
            );
            const dataEuro = await resEuro.json();
            setTasa(dataEuro.promedio || 0);
          } else {
            setTasa(data.promedio || 0);
          }
        } catch (apiErr) {
          console.warn('Fallo DolarAPI, usando tasa 0');
          setTasa(0);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [empresaId, supabase]);

  // Ocultar Navbar Global para una experiencia de catálogo limpia
  useEffect(() => {
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'none';
    return () => {
      if (nav) nav.style.display = 'flex';
    };
  }, []);

  const agregarAlCarrito = (p: any) => {
    setCarrito((prev) => {
      const existe = prev.find((item) => item.id === p.id);
      if (existe)
        return prev.map((item) =>
          item.id === p.id ? { ...item, cant: item.cant + 1 } : item,
        );
      return [...prev, { ...p, cant: 1 }];
    });
  };

  const enviarPedido = () => {
    const totalDolar = carrito.reduce((acc, p) => acc + p.precio * p.cant, 0);
    const totalBs = totalDolar * tasa;
    let mensaje = `*NUEVO PEDIDO - ${empresa?.nombre?.toUpperCase()}*%0A%0A`;

    carrito.forEach((p) => {
      mensaje += `• ${p.cant}x ${p.nombre} ($${(p.precio * p.cant).toFixed(2)})%0A`;
    });

    mensaje += `%0A*TOTAL: $${totalDolar.toFixed(2)}*%0A*BS. ${totalBs.toFixed(2)}*%0A%0A_Pedido generado desde Ventiq_`;

    const telf = empresa?.telefono?.replace(/\D/g, '');
    window.open(`https://wa.me/${telf}?text=${mensaje}`, '_blank');
  };

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center px-6">
          Sincronizando Vitrina de {empresa?.nombre || 'la Empresa'}...
        </p>
      </div>
    );

  if (error)
    return (
      <div className="h-screen flex flex-col items-center justify-center p-10 text-center bg-white">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="font-black uppercase text-slate-800 text-xl tracking-tighter">
          Ups, algo salió mal
        </h1>
        <p className="text-slate-500 text-xs mt-2 font-bold bg-red-50 p-3 rounded-xl border border-red-100">
          Error: {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
        >
          Reintentar
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <div className="bg-white p-8 rounded-b-[3.5rem] shadow-sm border-b border-slate-100 text-center">
        <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] mx-auto mb-4 flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
          {empresa?.logo_url ? (
            <img
              src={empresa.logo_url}
              className="w-full h-full object-contain p-2"
              alt="Logo Empresa"
            />
          ) : (
            <Building2 size={32} className="text-slate-300" />
          )}
        </div>
        <h1 className="font-black text-2xl uppercase tracking-tighter text-slate-800 leading-none">
          {empresa?.nombre}
        </h1>
        <div className="inline-block px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full mt-4">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
            Tasa Oficial: Bs. {tasa > 0 ? tasa.toFixed(2) : '---'}
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="px-6 -mt-7">
        <div className="relative group">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar en el menú..."
            className="w-full pl-14 pr-6 py-5 bg-white rounded-3xl shadow-xl outline-none font-bold text-sm border-2 border-transparent focus:border-orange-100 transition-all"
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="px-6 mt-10 space-y-4 max-w-3xl mx-auto">
        {productos
          .filter((p) => p.nombre.toLowerCase().includes(filtro.toLowerCase()))
          .map((p) => (
            <div
              key={p.id}
              className="bg-white p-4 rounded-[2.5rem] shadow-sm flex items-center gap-4 border border-transparent hover:border-orange-50 transition-all"
            >
              <div className="w-20 h-20 bg-slate-50 rounded-[1.8rem] flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-100">
                {p.imagen_url ? (
                  <img
                    src={p.imagen_url}
                    className="w-full h-full object-cover"
                    alt={p.nombre}
                  />
                ) : (
                  <Package className="text-slate-200" size={28} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-800 text-sm uppercase leading-tight truncate">
                  {p.nombre}
                </h3>
                <div className="mt-1 flex flex-col">
                  <span className="text-orange-500 font-black text-lg leading-none">
                    ${p.precio.toFixed(2)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                    Ref. Bs. {(p.precio * tasa).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => agregarAlCarrito(p)}
                className="bg-slate-900 text-white w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-slate-200"
              >
                <ShoppingCart size={18} />
              </button>
            </div>
          ))}

        {productos.length === 0 && !loading && (
          <div className="py-20 text-center opacity-30">
            <Package size={48} className="mx-auto mb-2" />
            <p className="font-black uppercase text-xs tracking-widest">
              Sin productos disponibles
            </p>
          </div>
        )}
      </div>

      {/* Footer del Carrito */}
      {carrito.length > 0 && (
        <div className="fixed bottom-8 left-6 right-6 z-50 animate-in slide-in-from-bottom-10 duration-500">
          <button
            onClick={enviarPedido}
            className="w-full bg-[#1A1D23] text-white p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between hover:bg-black transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500 p-3 rounded-2xl text-white group-active:scale-90 transition-transform">
                <MessageCircle size={24} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-emerald-400 leading-none uppercase tracking-widest mb-1">
                  Confirmar Pedido
                </p>
                <p className="text-lg font-black leading-none uppercase tracking-tighter">
                  {carrito.reduce((acc, item) => acc + item.cant, 0)} Items
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black leading-none">
                $
                {carrito
                  .reduce((acc, p) => acc + p.precio * p.cant, 0)
                  .toFixed(2)}
              </p>
              <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">
                Enviar WhatsApp
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
