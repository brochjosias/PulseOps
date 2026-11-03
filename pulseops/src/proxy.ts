import { NextResponse, type NextRequest } from 'next/server';

import { jwtVerify } from 'jose';

const ACCESS_COOKIE = 'pulseops_access';

function getAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET não configurado');
  }

  return new TextEncoder().encode(secret);
}

const PUBLIC_PATHS = ['/login', '/register'];

const PUBLIC_API = [
  '/api/auth',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Arquivos internos do Next
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // Páginas públicas
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // APIs públicas de autenticação
  if (PUBLIC_API.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_COOKIE)?.value;

  let authenticated = false;

  if (token) {
    try {
      await jwtVerify(token, getAccessSecret());

      authenticated = true;
    } catch {
      authenticated = false;
    }
  }

  // API protegida
  if (pathname.startsWith('/api')) {
    if (!authenticated) {
      return NextResponse.json(
        {
          message: 'Unauthorized',
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.next();
  }

  // Página protegida
  if (!authenticated) {
    const url = request.nextUrl.clone();

    url.pathname = '/login';
    url.searchParams.set('next', pathname);

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
