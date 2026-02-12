'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Corregimos el tipo de estado para permitir strings (mensajes de error)
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null); // Limpiamos errores previos

    // Renombramos el error que devuelve Supabase a 'authError' para no chocar
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // Si hay error de Supabase, lo guardamos en nuestro estado
      setErrorMsg(authError.message);
      setLoading(false);
    } else {
      // 1. Consultar el rol del usuario que acaba de entrar
      const { data: userData } = await supabase.auth.getUser();
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', userData.user?.id)
        .single();

      // 2. Redirigir según el rol
      if (perfil?.rol === 'superadmin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }

      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            FERREMATERIALES LER
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ingresa a tu panel de control
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                className="relative block w-full rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 focus:z-10 focus:border-blue-500 focus:outline-none sm:text-sm"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="relative block w-full rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 focus:z-10 focus:border-blue-500 focus:outline-none sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Mostramos el mensaje de error si existe */}
          {errorMsg && (
            <div className="text-sm text-red-500 text-center font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:bg-blue-400 transition-colors"
            >
              {loading ? 'Cargando...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
