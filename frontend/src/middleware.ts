import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if maintenance mode is enabled
  const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  
  // Skip maintenance check for:
  // - Admin routes (so admin can still access)
  // - API routes
  // - Static files
  // - Maintenance page itself
  const isAdminRoute = pathname.startsWith('/admin');
  const isApiRoute = pathname.startsWith('/api');
  const isStaticFile = pathname.startsWith('/_next') || 
                       pathname.startsWith('/favicon') ||
                       pathname.includes('.');
  const isMaintenancePage = pathname === '/maintenance';
  const isMobileRoute = pathname.startsWith('/mobile');
  
  // If maintenance mode is ON and it's a public route, redirect to maintenance page
  if (maintenanceMode && !isAdminRoute && !isApiRoute && !isStaticFile && !isMaintenancePage && !isMobileRoute) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }
  
  // If maintenance mode is OFF and user tries to access maintenance page, redirect to home
  if (!maintenanceMode && isMaintenancePage) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
