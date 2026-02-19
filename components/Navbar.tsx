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
  LayoutGrid,
  Power,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [rol, setRol] = useState<string | null>(null);

  useEffect(() => {
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
    { name: 'Historial', href: '/historial', icon: History },
    { name: 'Cobros', href: '/cobranzas', icon: BadgeDollarSign },
    { name: 'Empresa', href: '/configuracion', icon: Settings },
  ];

  return (
    <>
      {/* --- DISEÑO DESKTOP --- */}
      <nav className="hidden md:block bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            {/* --- LOGO VENTIQ ACTUALIZADO --- */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-105">
                <img
                  src="/logo_ventiq.png"
                  alt="Logo"
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-800">
                Venti<span className="text-[#FF9800]">q</span>
              </span>
            </Link>

            <div className="flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                    pathname === link.href
                      ? 'bg-white text-blue-600 shadow-md translate-y-[-1px]'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <link.icon size={16} strokeWidth={2.5} />
                  {link.name.toUpperCase()}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/configuracion"
                className={`p-3 rounded-2xl transition-all ${pathname === '/configuracion' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-100'}`}
              >
                <Settings size={22} />
              </Link>
              <div className="h-8 w-[1px] bg-slate-200 mx-2" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-red-500 font-black text-xs hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
              >
                <Power size={18} />
                SALIR
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- DISEÑO MOBILE (TAB BAR ESTILO APP) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 z-[100] pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
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
                  <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full shadow-[0_0_15px_rgba(59,130,246,1)]" />
                )}
                <link.icon
                  size={24}
                  className={`transition-all duration-300 ${isActive ? 'text-blue-400 scale-125' : 'text-slate-500'}`}
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
