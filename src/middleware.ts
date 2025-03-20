import { NextResponse, type NextRequest } from 'next/server';

const ORY_BASE_URL = process.env.ORY_BASE_URL || "http://localhost:4000";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for API routes and static files
  if (
    pathname.startsWith('/api/') || 
    pathname.includes('.') ||
    pathname.startsWith('/_next/')
  ) {
    return NextResponse.next();
  }
  
  // Check if user is authenticated for protected routes
  const protectedRoutes = [
    '/account',
    '/settings',
    '/dashboard',
    '/admin',
    '/onboarding'
  ];
  
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route) || pathname === route
  );
  
  if (isProtectedRoute) {
    try {
      // Get the session
      const cookieHeader = request.headers.get('cookie') || '';
      const response = await fetch(`${ORY_BASE_URL}/sessions/whoami`, {
        method: 'GET',
        headers: {
          Cookie: cookieHeader,
        },
      });
      
      if (!response.ok) {
        // Redirect to auth page if not authenticated
        const url = new URL('/auth', request.url);
        url.searchParams.set('return_to', pathname);
        return NextResponse.redirect(url);
      }
      
      const session = await response.json();
      
      // Special case for onboarding - let it proceed if authenticated
      if (pathname === '/onboarding') {
        // If they already have an account_id, redirect to their profile
        if (session.identity?.metadata_public?.account_id) {
          return NextResponse.redirect(
            new URL(`/${session.identity.metadata_public.account_id}`, request.url)
          );
        }
        return NextResponse.next();
      }
      
      // For all other protected routes, check if user has account_id
      if (!session.identity?.metadata_public?.account_id) {
        // Redirect to onboarding if they don't have an account_id
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      // Redirect to auth page on error
      const url = new URL('/auth', request.url);
      return NextResponse.redirect(url);
    }
  }
  
  // Handle dynamic profile routes (e.g., /[account_id])
  if (pathname.match(/^\/[^\/]+\/?$/)) {
    try {
      // Check if the user is authenticated
      const cookieHeader = request.headers.get('cookie') || '';
      const response = await fetch(`${ORY_BASE_URL}/sessions/whoami`, {
        method: 'GET',
        headers: {
          Cookie: cookieHeader,
        },
      });
      
      // If not authenticated, allow viewing the profile (it's public)
      if (!response.ok) {
        return NextResponse.next();
      }
      
      const session = await response.json();
      
      // If authenticated but no account_id, redirect to onboarding
      if (!session.identity?.metadata_public?.account_id) {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
      
      // Otherwise allow viewing the profile
      return NextResponse.next();
    } catch (error) {
      console.error('Error checking authentication for profile page:', error);
      return NextResponse.next();
    }
  }
  
  // Check if user is already logged in when accessing auth page
  if (pathname === '/auth') {
    try {
      const cookieHeader = request.headers.get('cookie') || '';
      const response = await fetch(`${ORY_BASE_URL}/sessions/whoami`, {
        method: 'GET',
        headers: {
          Cookie: cookieHeader,
        },
      });
      
      if (response.ok) {
        const session = await response.json();
        
        // If they have an account_id, redirect to their profile
        if (session.identity?.metadata_public?.account_id) {
          return NextResponse.redirect(
            new URL(`/${session.identity.metadata_public.account_id}`, request.url)
          );
        }
        
        // If authenticated but no account_id, redirect to onboarding
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
    } catch (error) {
      console.error('Error checking session for auth page:', error);
    }
  }
  
  return NextResponse.next();
} 