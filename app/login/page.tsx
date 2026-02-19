'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LogIn, ArrowRight } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [textIndex, setTextIndex] = useState(0);
  const router = useRouter();

  const phrases = [
    'Control de inventarios automático',
    'Manejo de cotizaciones y ventas',
    'Reportes automatizados en tiempo real',
    'Gestión de cobranza eficiente',
  ];

  // Efecto para rotar las palabras
  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % phrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setErrorMsg('Credenciales incorrectas');
      setLoading(false);
      return;
    }

    router.refresh();
    router.push('/');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0F1115] overflow-hidden px-4">
      {/* Luces de fondo decorativas (no afectan rendimiento) */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-900/10 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-md space-y-8 rounded-[3rem] bg-[#1A1D23]/80 p-10 shadow-2xl backdrop-blur-xl border border-white/5">
        {/* Espacio para el Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="relative w-20 h-20 mb-4 drop-shadow-2xl">
            <Image
              src="/logo_ventiq.png" // Tu ruta solicitada
              alt="Ventiq Logo"
              fill
              className="object-contain"
              priority
            />
          </div>

          <h2 className="text-4xl font-black text-white tracking-tighter">
            Venti<span className="text-[#FF9800]">q</span>
          </h2>

          {/* Efecto de palabras en movimiento */}
          <div className="h-6 mt-2 overflow-hidden">
            <p
              key={textIndex}
              className="text-sm text-purple-400 font-medium animate-fade-in-up uppercase tracking-widest"
            >
              {phrases[textIndex]}
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div className="group">
              <label className="text-[10px] font-bold text-gray-500 ml-4 mb-1 block uppercase tracking-[0.2em] group-focus-within:text-[#FF9800] transition-colors">
                Usuario
              </label>
              <input
                type="email"
                required
                className="block w-full rounded-2xl border-none bg-[#252932] px-6 py-4 text-white ring-1 ring-white/5 placeholder:text-gray-600 focus:ring-2 focus:ring-[#FF9800] outline-none transition-all"
                placeholder="admin@ventiq.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="group">
              <label className="text-[10px] font-bold text-gray-500 ml-4 mb-1 block uppercase tracking-[0.2em] group-focus-within:text-[#FF9800] transition-colors">
                Contraseña
              </label>
              <input
                type="password"
                required
                className="block w-full rounded-2xl border-none bg-[#252932] px-6 py-4 text-white ring-1 ring-white/5 placeholder:text-gray-600 focus:ring-2 focus:ring-[#FF9800] outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-400 text-center font-bold animate-shake">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center items-center gap-3 rounded-2xl bg-gradient-to-r from-[#FF9800] to-[#F57C00] py-4 px-4 text-sm font-black text-white hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-orange-900/20 uppercase tracking-widest"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Entrar al sistema
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest">
          Version 2.0 &bull; 2026
        </p>
      </div>

      {/* Estilos adicionales para animaciones en el mismo archivo o global.css */}
      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
}
