'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { name: '📦 Inventario', href: '/' },
    { name: '👥 Clientes', href: '/clientes' },
    { name: '📝 Cotizar', href: '/cotizar' },
    { name: '📜 Historial', href: '/historial' }, // <-- Nuevo link agregado
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="text-blue-600 font-black tracking-tighter text-xl hover:opacity-80 transition-opacity"
          >
            COTI
          </Link>

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
        </div>
      </div>
    </nav>
  );
}
