'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

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
      const pathname = usePathname();

      // No renderizar Navbar en el login
      if (pathname === '/login') return null;
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
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Definimos qué links ve cada quién
  const getLinks = () => {
    if (rol === 'admin') {
      return [{ name: '🏠 Panel Maestro', href: '/admin' }];
    }

    const baseLinks = [
      { name: '📦 Inventario', href: '/' },
      { name: '👥 Clientes', href: '/clientes' },
      { name: '📝 Cotizar', href: '/cotizar' },
      { name: '📜 Historial', href: '/historial' },
    ];

    // Si es vendedor, podrías filtrar aquí si no quieres que vea el Inventario
    // o el Historial global.
    return baseLinks;
  };

  const links = getLinks();

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="text-blue-600 font-black tracking-tighter text-xl hover:opacity-80 transition-opacity"
          >
            COTI
            {rol === 'admin' && (
              <span className="text-[10px] ml-1 bg-blue-100 px-1 rounded">
                ADMIN
              </span>
            )}
          </Link>

          <div className="flex items-center gap-1 md:gap-4">
            <div className="flex gap-1 md:gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                    pathname === link.href
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="h-6 w-[1px] bg-slate-200 mx-2 hidden md:block" />

            <button
              onClick={handleLogout}
              className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
