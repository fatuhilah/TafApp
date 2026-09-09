import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pastikan ada kata "export function middleware" di sini
export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get("tafapp_auth")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";

  // Jika belum login dan mencoba akses selain halaman login
  if (!authCookie && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Jika sudah login tapi mencoba buka halaman login lagi, arahkan ke Beranda
  if (authCookie && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|logo-bmkg.png).*)",
  ],
};
