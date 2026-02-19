'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LogIn, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setErrorMsg('Credenciales incorrectas o error de conexión');
      setLoading(false);
      return;
    }

    router.refresh();
    router.push('/');
  };

  return (
    // Fondo oscuro profesional con un toque de gradiente púrpura profundo
    <div className="flex min-h-screen items-center justify-center bg-[#121212] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#2D1B4E] via-[#121212] to-[#121212] px-4">
      <div className="w-full max-w-md space-y-8 rounded-[3rem] bg-white/95 p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-sm border border-white/20">
        {/* Header con el nuevo Logo Ventiq */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-[#5D12D2] shadow-xl shadow-purple-200 rotate-3">
            <span className="text-white font-black text-3xl tracking-tighter -rotate-3">
              V
            </span>
          </div>

          <h2 className="text-4xl font-black text-[#2D2D2D] tracking-tighter">
            Venti<span className="text-[#FF9800]">q</span>
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-semibold uppercase tracking-widest">
            Ventas Inteligentes
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-[#5D12D2] ml-2 mb-1 block uppercase tracking-[0.2em]">
                Usuario Registrado
              </label>
              <input
                type="email"
                required
                className="block w-full rounded-2xl border-none bg-gray-100/50 px-5 py-4 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#FF9800] outline-none transition-all"
                placeholder="correo@ventiq.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-[#5D12D2] ml-2 mb-1 block uppercase tracking-[0.2em]">
                Contraseña de Acceso
              </label>
              <input
                type="password"
                required
                className="block w-full rounded-2xl border-none bg-gray-100/50 px-5 py-4 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#FF9800] outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-2xl bg-red-50 p-4 text-xs text-red-600 text-center font-bold border border-red-100">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center items-center gap-3 rounded-2xl bg-gradient-to-r from-[#FF9800] to-[#F57C00] py-4 px-4 text-sm font-black text-white hover:scale-[1.02] active:scale-[0.98] focus:outline-none disabled:opacity-50 transition-all shadow-xl shadow-orange-200/50 uppercase tracking-widest"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Validando...
              </span>
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

        <div className="pt-4 text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Powered by Ventiq &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
