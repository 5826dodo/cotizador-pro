'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  ShoppingCart,
  Search,
  MessageCircle,
  Building2,
  Package,
  X,
} from 'lucide-react';

export default function CatalogoPublico({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const [empresa, setEmpresa] = useState<any>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [carrito, setCarrito] = useState<any[]>([]);
  const [tasa, setTasa] = useState(0);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: emp } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', params.id)
        .single();
      if (emp) {
        setEmpresa(emp);
        const { data: prod } = await supabase
          .from('productos')
          .select('*')
          .eq('empresa_id', params.id)
          .gt('stock', 0);
        setProductos(prod || []);

        const endpoint =
          emp.moneda_secundaria === 'EUR' ? 'euros/oficial' : 'dolares/oficial';
        const res = await fetch(`https://ve.dolarapi.com/v1/${endpoint}`);
        const data = await res.json();
        setTasa(data.promedio || 0);
      }
    };
    cargarDatos();
  }, [params.id, supabase]);

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

  const quitarDelCarrito = (id: string) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const enviarPedido = () => {
    const totalDolar = carrito.reduce((acc, p) => acc + p.precio * p.cant, 0);
    const totalBs = totalDolar * tasa;

    let mensaje = `*NUEVO PEDIDO - VENTIQ*%0A%0A`;
    mensaje += `*Cliente:* _Vía Catálogo Público_%0A%0A`;
    carrito.forEach((p) => {
      mensaje += `• ${p.cant}x ${p.nombre} ($${(p.precio * p.cant).toFixed(2)})%0A`;
    });
    mensaje += `%0A*TOTAL: $${totalDolar.toFixed(2)}*%0A*Ref. Tasa: Bs. ${totalBs.toFixed(2)}*%0A%0A_¿Me podrían confirmar disponibilidad?_`;

    // Limpiamos el número por si acaso
    const telf = empresa.telefono?.replace(/\D/g, '');
    window.open(`https://wa.me/${telf}?text=${mensaje}`, '_blank');
  };

  if (!empresa)
    return (
      <div className="h-screen flex items-center justify-center font-black animate-pulse">
        CARGANDO CATÁLOGO...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {/* Header Estilo App */}
      <div className="bg-white p-8 rounded-b-[3.5rem] shadow-sm text-center border-b border-slate-100">
        <div className="w-24 h-24 mx-auto mb-4 bg-slate-50 rounded-[2.5rem] flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
          {empresa.logo_url ? (
            <img
              src={empresa.logo_url}
              className="w-full h-full object-contain p-2"
              alt="Logo"
            />
          ) : (
            <Building2 className="text-slate-300" size={40} />
          )}
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-tight">
          {empresa.nombre}
        </h1>
        <div className="inline-block mt-3 px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
            Tasa {empresa.moneda_secundaria === 'EUR' ? 'Euro' : 'Dólar'}: Bs.{' '}
            {tasa.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Buscador Pegajoso */}
      <div className="px-6 -mt-6 sticky top-4 z-40">
        <div className="relative group">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar productos..."
            className="w-full pl-14 pr-6 py-5 bg-white rounded-[2rem] shadow-xl outline-none font-bold text-slate-700 border-2 border-transparent focus:border-orange-100"
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="px-6 mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productos
          .filter((p) => p.nombre.toLowerCase().includes(filtro.toLowerCase()))
          .map((p) => (
            <div
              key={p.id}
              className="bg-white p-5 rounded-[2.5rem] shadow-sm flex items-center gap-4 border border-transparent hover:border-orange-100 hover:shadow-md transition-all"
            >
              {/* Espacio para la Imagen */}
              <div className="w-24 h-24 bg-slate-50 rounded-[1.8rem] flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-100">
                {p.imagen_url ? (
                  <img
                    src={p.imagen_url}
                    alt={p.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="text-slate-200" size={32} />
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-black text-slate-800 text-sm uppercase leading-tight mb-1">
                  {p.nombre}
                </h3>
                <div className="flex flex-col">
                  <span className="text-orange-500 font-black text-lg">
                    ${p.precio.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    Ref. Bs. {(p.precio * tasa).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => agregarAlCarrito(p)}
                className="bg-[#1A1D23] text-white w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-slate-200"
              >
                <ShoppingCart size={20} />
              </button>
            </div>
          ))}
      </div>

      {/* Footer / Carrito */}
      {carrito.length > 0 && (
        <div className="fixed bottom-8 left-6 right-6 z-50 animate-in slide-in-from-bottom-10 duration-500">
          <button
            onClick={enviarPedido}
            className="w-full bg-[#1A1D23] text-white p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between hover:bg-black transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="bg-[#FF9800] p-3 rounded-2xl text-white">
                <MessageCircle size={24} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase text-[#FF9800] leading-none tracking-widest mb-1">
                  Enviar por WhatsApp
                </p>
                <p className="text-lg font-black leading-none">
                  {carrito.length} Items en el carrito
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black">
                $
                {carrito
                  .reduce((acc, p) => acc + p.precio * p.cant, 0)
                  .toFixed(2)}
              </p>
              <p className="text-[9px] font-bold opacity-60 uppercase">
                Finalizar Pedido
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
