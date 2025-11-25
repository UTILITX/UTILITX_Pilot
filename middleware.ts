import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * UTILITX Middleware - Clean PKCE Implementation
 * 
 * No authentication logic needed - all auth is handled client-side via PKCE OAuth.
 * This middleware is minimal and only handles non-auth concerns.
 */
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
