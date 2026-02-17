'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
// Importa un icono si usas lucide-react o similar, si no, lo dejamos como SVG
import { LogIn } from 'lucide-react';

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
    // Fondo con degradado sutil como el header de tu app
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E0F7F9] via-white to-[#E0F7F9] px-4">
      <div className="w-full max-w-md space-y-8 rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-blue-100/50 border border-white">
        {/* Logo / Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
            <span className="text-white font-black text-2xl tracking-tighter">
              SP
            </span>
          </div>
          <h2 className="text-3xl font-black text-[#1E3A8A] tracking-tight">
            SISCO<span className="text-blue-500">PRO</span>
          </h2>
          <p className="mt-2 text-sm text-gray-400 font-medium">
            Bienvenido, ingresa a tu panel
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block uppercase tracking-wider">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                className="block w-full rounded-2xl border-none bg-gray-50 px-4 py-4 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none transition-all"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block uppercase tracking-wider">
                Contraseña
              </label>
              <input
                type="password"
                required
                className="block w-full rounded-2xl border-none bg-gray-50 px-4 py-4 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-500 text-center font-semibold animate-pulse">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center items-center gap-2 rounded-2xl bg-[#1E60FF] py-4 px-4 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none disabled:bg-blue-300 transition-all shadow-lg shadow-blue-200"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Iniciando...
              </span>
            ) : (
              <>
                <LogIn size={18} />
                ENTRAR AL SISTEMA
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          &copy; 2026 SISCOPRO - Gestión Eficiente
        </p>
      </div>
    </div>
  );
}
