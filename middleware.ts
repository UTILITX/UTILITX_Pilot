import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Minimal middleware - no auth logic needed for client-side PKCE flow
export function middleware(request: NextRequest) {
  // No authentication logic needed - handled client-side
  return NextResponse.next()
}

// Configure which routes this middleware runs on
export const config = {
  // Run on all routes except static files
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
