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
    { name: 'Cobros', href: '/cobranzas', icon: BadgeDollarSign },
    { name: 'Historial', href: '/historial', icon: History },
  ];

  return (
    <>
      {/* --- DISEÑO DESKTOP --- */}
      <nav className="hidden md:block bg-white/70 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-200 group-hover:rotate-6 transition-transform">
                <LayoutGrid className="text-white" size={22} />
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-800">
                COTI<span className="text-blue-600 italic">PRO</span>
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
      <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[100] border border-white/10 overflow-hidden">
        <div className="flex justify-between items-center h-20 px-4">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative flex flex-col items-center justify-center w-full"
              >
                {isActive && (
                  <div className="absolute -top-4 w-8 h-1 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,1)]" />
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

          {/* BOTÓN SALIR MÓVIL (Con icono diferenciado) */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center w-full"
          >
            <LogOut
              size={24}
              className="text-red-400 opacity-80"
              strokeWidth={2}
            />
            <span className="text-[8px] font-black mt-1.5 text-red-400 uppercase tracking-widest">
              Salir
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
