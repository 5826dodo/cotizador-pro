import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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
  const url = request.nextUrl.clone();

  // 1. Si NO hay usuario y no está en login, al login
  if (!user && !url.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Si HAY usuario, verificamos su rol para saber a dónde mandarlo
  if (user) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    // Si el usuario está logueado pero intenta ver el login, sácalo de ahí
    if (url.pathname.startsWith('/login')) {
      const destino = perfil?.rol === 'admin' ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(destino, request.url));
    }

    // Si está en la raíz (/), mándalo a su panel según el rol
    if (url.pathname === '/') {
      const destino = perfil?.rol === 'admin' ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(destino, request.url));
    }

    // Si es admin e intenta ir a otro lado que no sea /admin
    if (perfil?.rol === 'admin' && !url.pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // Si es cliente e intenta ir a /admin o está en la raíz
    if (
      perfil?.rol === 'cliente' &&
      (url.pathname.startsWith('/admin') || url.pathname === '/')
    ) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
