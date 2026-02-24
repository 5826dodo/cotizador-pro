'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Settings,
  Package,
  Users,
  FileEdit,
  History,
  BadgeDollarSign,
  LogOut,
  Power,
  RefreshCw, // Nuevo icono para refrescar
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [rol, setRol] = useState<string | null>(null);

  // --- ESTADOS PARA LA TASA ---
  const [tasa, setTasa] = useState<number | null>(null);
  const [cargandoTasa, setCargandoTasa] = useState(false);

  const obtenerTasa = async () => {
    setCargandoTasa(true);
    try {
      // Usando dolarapi.com para BCV
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      const data = await res.json();
      if (data && data.promedio) {
        setTasa(data.promedio);
      }
    } catch (error) {
      console.error('Error al obtener tasa:', error);
    } finally {
      setCargandoTasa(false);
    }
  };

  useEffect(() => {
    obtenerTasa(); // Carga inicial

    async function getUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', user.id)
          .single();
        setRol(data?.rol || null);
      }
    }
    getUserData();
  }, [supabase]);

  const handleLogout = async () => {
    if (confirm('¿Cerrar sesión ahora?')) {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    }
  };

  if (pathname === '/login') return null;

  const links = [
    { name: 'Stock', href: '/', icon: Package },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Cotizar', href: '/cotizar', icon: FileEdit },
    { name: 'Cobros', href: '/cobranzas', icon: BadgeDollarSign },
    { name: 'Historial', href: '/historial', icon: History },
  ];

  return (
    <>
      {/* --- DISEÑO DESKTOP --- */}
      <nav className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            {/* Logo Ventiq */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 transition-transform group-hover:scale-110">
                <img
                  src="/logo_ventiq.png"
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-2xl font-black tracking-tighter text-[#1A1D23]">
                Venti<span className="text-[#FF9800]">q</span>
              </span>
            </Link>

            {/* Links Centrados */}
            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-[#1A1D23] text-[#FF9800] shadow-lg shadow-orange-100'
                        : 'text-slate-500 hover:text-[#1A1D23] hover:bg-white'
                    }`}
                  >
                    <link.icon size={16} strokeWidth={2.5} />
                    {link.name.toUpperCase()}
                  </Link>
                );
              })}
            </div>

            {/* Acciones Finales + TASA BCV */}
            <div className="flex items-center gap-3">
              {/* Widget de Tasa BCV */}
              <div className="flex items-center gap-3 bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100 shadow-sm">
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-orange-400 uppercase leading-none tracking-widest">
                    Tasa BCV
                  </span>
                  <span className="text-sm font-black text-slate-800">
                    {tasa ? `Bs. ${tasa.toFixed(2)}` : '---'}
                  </span>
                </div>
                <button
                  onClick={obtenerTasa}
                  disabled={cargandoTasa}
                  className="p-1.5 hover:bg-white rounded-lg transition-all text-orange-500 disabled:opacity-50"
                >
                  <RefreshCw
                    size={14}
                    className={cargandoTasa ? 'animate-spin' : ''}
                  />
                </button>
              </div>

              <div className="h-8 w-[1px] bg-slate-200 mx-1" />

              <Link
                href="/configuracion"
                className={`p-3 rounded-2xl transition-all ${
                  pathname === '/configuracion'
                    ? 'bg-[#FF9800] text-white shadow-lg shadow-orange-200'
                    : 'text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Settings size={22} />
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-red-500 font-black text-xs hover:bg-red-50 transition-all"
              >
                <Power size={18} />
                SALIR
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- DISEÑO MOBILE --- */}
      {/* Añadimos la tasa flotante en mobile para que no ocupe espacio en el tab bar */}
      <div className="md:hidden fixed top-4 right-4 z-[60]">
        <div className="bg-[#1A1D23] text-white px-3 py-1.5 rounded-full flex items-center gap-2 shadow-xl border border-white/10">
          <span className="text-[7px] font-black text-[#FF9800] uppercase tracking-tighter">
            BCV
          </span>
          <span className="text-xs font-bold">
            {tasa ? tasa.toFixed(2) : '...'}
          </span>
        </div>
      </div>

      {/* --- DISEÑO MOBILE (TAB BAR) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1A1D23] border-t border-white/5 z-[100] pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center h-16 px-4 overflow-x-auto scrollbar-hide gap-6">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative flex flex-col items-center justify-center min-w-[64px] h-full active:scale-90 transition-transform"
              >
                {isActive && (
                  <div className="absolute top-0 w-8 h-1 bg-[#FF9800] rounded-b-full shadow-[0_0_15px_rgba(255,152,0,0.6)]" />
                )}
                <link.icon
                  size={24}
                  className={`transition-all duration-300 ${isActive ? 'text-[#FF9800] scale-125' : 'text-slate-500'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={`text-[8px] font-black mt-1.5 uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-500'}`}
                >
                  {link.name}
                </span>
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center min-w-[64px] h-full"
          >
            <LogOut size={24} className="text-red-400 opacity-80" />
            <span className="text-[8px] font-black mt-1.5 text-red-400 uppercase tracking-widest">
              Salir
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
