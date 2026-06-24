import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh da sessão — obrigatório para que getUser() funcione em Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rotas públicas que NÃO devem redirecionar mesmo autenticado
  const publicRoutes = ["/register", "/forgot-password", "/reset-password"];

  // Rotas de auth que devem redirecionar para dashboard se já logado
  const authOnlyRoutes = ["/login"];

  // Proteger /dashboard/** — redireciona para login se não autenticado
  if (!user && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Usuário autenticado tentando acessar /login → redirecionar para dashboard
  if (user && authOnlyRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Rotas públicas: acessíveis sem auth (publicRoutes e /api/**)
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Aplicar em todas as rotas exceto static assets, imagens e favicon
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
