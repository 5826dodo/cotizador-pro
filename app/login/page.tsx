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

  // Estados para el efecto máquina de escribir
  const [displayText, setDisplayText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(100);

  const phrases = [
    'Control de inventarios automático',
    'Manejo de cotizaciones y ventas',
    'Reportes automatizados',
    'Gestión de cobranza eficiente',
  ];

  const router = useRouter();

  // Lógica del efecto Máquina de Escribir
  useEffect(() => {
    const handleTyping = () => {
      const currentPhrase = phrases[phraseIndex];

      if (!isDeleting) {
        setDisplayText(currentPhrase.substring(0, displayText.length + 1));
        setTypingSpeed(100);

        if (displayText === currentPhrase) {
          setTimeout(() => setIsDeleting(true), 2000); // Pausa al terminar de escribir
        }
      } else {
        setDisplayText(currentPhrase.substring(0, displayText.length - 1));
        setTypingSpeed(50);

        if (displayText === '') {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex]);

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
    // Fondo de página: Oscuro elegante para que el formulario resalte
    <div className="flex min-h-screen items-center justify-center bg-[#0D0F12] px-4">
      {/* Círculos de luz suaves al fondo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative w-full max-w-md space-y-8 rounded-[2.5rem] bg-white p-10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-gray-100">
        {/* Logo y Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative w-24 h-16 mb-2">
            {/* Next.js busca automáticamente en la carpeta /public */}
            <img
              src="/logo_ventiq.png"
              alt="Logo Ventiq"
              className="object-contain"
            />
          </div>

          <h2 className="text-4xl font-black text-[#1A1D23] tracking-tighter">
            Venti<span className="text-[#FF9800]">q</span>
          </h2>

          {/* Subtítulo con efecto máquina de escribir */}
          <div className="h-5 mt-2 flex items-center justify-center">
            <p className="text-[11px] font-mono font-bold text-purple-600 uppercase tracking-widest border-r-2 border-purple-600 pr-1 animate-pulse-caret">
              {displayText}
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 ml-4 mb-1 block uppercase tracking-widest">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                className="block w-full rounded-2xl border-none bg-gray-50 px-6 py-4 text-gray-900 ring-1 ring-gray-200 focus:ring-2 focus:ring-[#FF9800] outline-none transition-all"
                placeholder="usuario@ventiq.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 ml-4 mb-1 block uppercase tracking-widest">
                Contraseña
              </label>
              <input
                type="password"
                required
                className="block w-full rounded-2xl border-none bg-gray-50 px-6 py-4 text-gray-900 ring-1 ring-gray-200 focus:ring-2 focus:ring-[#FF9800] outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-500 text-center font-bold border border-red-100 animate-bounce-short">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center items-center gap-3 rounded-2xl bg-[#1A1D23] py-4 px-4 text-sm font-bold text-white hover:bg-[#2D3139] active:scale-[0.98] transition-all shadow-xl shadow-gray-200"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="uppercase tracking-widest">
                  Iniciar Sesión
                </span>
                <ArrowRight
                  size={18}
                  className="text-[#FF9800] group-hover:translate-x-1 transition-transform"
                />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <span className="text-[10px] text-gray-300 font-bold tracking-[0.3em] uppercase">
            Ventiq System v2.0
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-caret {
          from,
          to {
            border-color: transparent;
          }
          50% {
            border-color: #5d12d2;
          }
        }
        .animate-pulse-caret {
          animation: pulse-caret 0.8s step-end infinite;
        }
        @keyframes bounce-short {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        .animate-bounce-short {
          animation: bounce-short 0.3s ease-in-out 2;
        }
      `}</style>
    </div>
  );
}
