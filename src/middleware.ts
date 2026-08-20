import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const adminPaths = ['/admin']
const authPaths = ['/login', '/register']
const apiPaths = ['/api']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files and next assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }
  
  // Get session cookie
  const sessionCookie = request.cookies.get('session')?.value
  
  // Handle API routes - add CORS headers
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200 })
    }
    
    return response
  }
  
  // Redirect authenticated users away from auth pages
  if (sessionCookie && authPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // For admin paths, check if user has admin role
  if (adminPaths.some(path => pathname.startsWith(path))) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Note: Full role validation happens in API route handlers
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (robots.txt, sitemap.xml, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
