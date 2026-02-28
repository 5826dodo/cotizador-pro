import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // --- EXTRA DE SEGURIDAD PARA ARCHIVOS ESTÁTICOS ---
  // Si la ruta termina en extensiones de imagen o recursos, permitimos el paso directo
  // sin ejecutar la lógica de autenticación de Supabase.
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Si NO hay usuario y no está en login, redirigir al login
  if (!user && !url.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Si HAY usuario, verificamos su rol para redirecciones automáticas
  if (user) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    // Si el usuario está logueado pero intenta ver el login, sacarlo de ahí
    if (url.pathname.startsWith('/login')) {
      const destino = perfil?.rol === 'admin' ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(destino, request.url));
    }

    // Si está en la raíz (/), mándalo a su panel según el rol
    if (url.pathname === '/') {
      const destino = perfil?.rol === 'admin' ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(destino, request.url));
    }

    // Si es admin e intenta ir a otro lado que no sea /admin (protección de área)
    if (perfil?.rol === 'admin' && !url.pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // Si es cliente e intenta ir a /admin
    if (perfil?.rol === 'cliente' && url.pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  /*
   * El matcher ahora excluye explícitamente:
   * - api, _next/static, _next/image, favicon.ico
   * - Cualquier archivo que termine en extensiones de imagen comunes
   */
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/((?!api|_next/static|_next/image|favicon.ico|catalogo).*)',
  ],
};
