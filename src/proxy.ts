import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { NEXT_PATH_COOKIE } from "@/lib/auth-cookies";

const SESSION_COOKIE = "financias_session";

const protectedPrefixes = [
  "/dashboard",
  "/transacoes",
  "/metas",
  "/investimentos",
  "/contas",
  "/cartoes",
  "/dividas",
  "/grupos",
  "/ia",
  "/configuracoes",
  "/relatorio",
];

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let loggedIn = false;

  if (token && process.env.AUTH_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      loggedIn = true;
    } catch {
      loggedIn = false;
    }
  }

  const { pathname } = req.nextUrl;
  const isProtected = protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname.startsWith("/cadastro/") ||
    pathname === "/recuperar" ||
    pathname.startsWith("/recuperar/");

  if (isProtected && !loggedIn) {
    const url = new URL("/login", req.url);
    const res = NextResponse.redirect(url);
    res.cookies.set(NEXT_PATH_COOKIE, pathname, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
    return res;
  }

  if (isAuthPage && loggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/transacoes",
    "/transacoes/:path*",
    "/metas",
    "/metas/:path*",
    "/investimentos",
    "/investimentos/:path*",
    "/contas",
    "/contas/:path*",
    "/cartoes",
    "/cartoes/:path*",
    "/dividas",
    "/dividas/:path*",
    "/grupos",
    "/grupos/:path*",
    "/ia",
    "/ia/:path*",
    "/configuracoes",
    "/configuracoes/:path*",
    "/relatorio",
    "/relatorio/:path*",
    "/login",
    "/cadastro",
    "/cadastro/:path*",
    "/recuperar",
    "/recuperar/:path*",
  ],
};
