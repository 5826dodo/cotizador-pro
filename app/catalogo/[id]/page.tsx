'use client';
import { useEffect, useState } from 'react';
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
  params: { id: string };
}) {
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
        if (!params.id) throw new Error('ID de empresa no proporcionado');

        // 2. Obtener Empresa
        const { data: emp, error: empError } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', params.id)
          .single();

        if (empError || !emp) throw new Error('Empresa no encontrada');
        setEmpresa(emp);

        // 3. Obtener Productos
        const { data: prod, error: prodError } = await supabase
          .from('productos')
          .select('*')
          .eq('empresa_id', params.id)
          .gt('stock', 0); // Solo los que tienen existencia

        if (prodError) console.error('Error productos:', prodError);
        setProductos(prod || []);

        // 4. Obtener Tasa (Corregido el endpoint para evitar el 400)
        try {
          // Usamos el endpoint general que es más estable
          const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
          const data = await res.json();

          // Si la empresa prefiere Euro, buscamos el Euro
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
  }, [params.id]);

  // Ocultar Navbar Global
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
    let mensaje = `*NUEVO PEDIDO - ${empresa.nombre?.toUpperCase()}*%0A%0A`;
    carrito.forEach((p) => {
      mensaje += `• ${p.cant}x ${p.nombre} ($${(p.precio * p.cant).toFixed(2)})%0A`;
    });
    mensaje += `%0A*TOTAL: $${totalDolar.toFixed(2)}*%0A*BS. ${totalBs.toFixed(2)}*%0A%0A_Enviado desde Ventiq_`;
    window.open(
      `https://wa.me/${empresa.telefono?.replace(/\D/g, '')}?text=${mensaje}`,
      '_blank',
    );
  };

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Cargando Vitrina...
        </p>
      </div>
    );

  if (error)
    return (
      <div className="h-screen flex flex-col items-center justify-center p-10 text-center">
        <AlertCircle size={40} className="text-red-500 mb-4" />
        <h1 className="font-black uppercase text-slate-800">
          Ups, algo salió mal
        </h1>
        <p className="text-slate-500 text-xs mt-2">{error}</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <div className="bg-white p-8 rounded-b-[3rem] shadow-sm border-b border-slate-100 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-[2rem] mx-auto mb-4 flex items-center justify-center overflow-hidden">
          {empresa?.logo_url ? (
            <img
              src={empresa.logo_url}
              className="w-full h-full object-contain"
            />
          ) : (
            <Building2 className="text-slate-300" />
          )}
        </div>
        <h1 className="font-black text-xl uppercase tracking-tighter text-slate-800">
          {empresa?.nombre}
        </h1>
        <div className="inline-block px-4 py-1 bg-emerald-50 border border-emerald-100 rounded-full mt-2">
          <p className="text-[9px] font-black text-emerald-600 uppercase">
            Tasa: Bs. {tasa.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="px-6 -mt-6">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar productos..."
            className="w-full pl-12 pr-4 py-5 bg-white rounded-2xl shadow-xl outline-none font-bold text-sm"
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </div>

      {/* Lista */}
      <div className="px-6 mt-8 space-y-4">
        {productos
          .filter((p) => p.nombre.toLowerCase().includes(filtro.toLowerCase()))
          .map((p) => (
            <div
              key={p.id}
              className="bg-white p-4 rounded-[2rem] shadow-sm flex items-center gap-4"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-100">
                {p.imagen_url ? (
                  <img
                    src={p.imagen_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="text-slate-200" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-800 text-xs uppercase">
                  {p.nombre}
                </h3>
                <p className="text-orange-500 font-black text-base">
                  ${p.precio.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => agregarAlCarrito(p)}
                className="bg-slate-900 text-white p-3 rounded-xl active:scale-90 transition-all"
              >
                <ShoppingCart size={18} />
              </button>
            </div>
          ))}
      </div>

      {/* Carrito Flotante */}
      {carrito.length > 0 && (
        <div className="fixed bottom-6 left-6 right-6">
          <button
            onClick={enviarPedido}
            className="w-full bg-[#1A1D23] text-white p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="text-emerald-400" />
              <div className="text-left">
                <p className="text-[10px] font-black text-emerald-400 leading-none">
                  PEDIR POR WHATSAPP
                </p>
                <p className="text-sm font-black">{carrito.length} PRODUCTOS</p>
              </div>
            </div>
            <p className="text-xl font-black">
              $
              {carrito
                .reduce((acc, p) => acc + p.precio * p.cant, 0)
                .toFixed(2)}
            </p>
          </button>
        </div>
      )}
    </div>
  );
}
