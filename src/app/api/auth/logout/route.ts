import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ORY_BASE_URL = process.env.ORY_BASE_URL || "https://playground.projects.oryapis.com";

export async function POST() {
  try {
    // Get the session cookie
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    
    // Create a logout flow
    const response = await fetch(`${ORY_BASE_URL}/self-service/logout/browser`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
      },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to initiate logout' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Execute the logout
    if (data.logout_url) {
      const logoutResponse = await fetch(data.logout_url, {
        method: 'GET',
        redirect: 'manual',
      });
      
      // Clear cookies
      const responseCookies = logoutResponse.headers.getSetCookie();
      
      // Create a response with cleared cookies
      const responseObj = NextResponse.json({ success: true });
      
      // Apply the cookies from Ory to our response
      responseCookies.forEach(cookie => {
        const [name, ...rest] = cookie.split('=');
        const value = rest.join('=').split(';')[0];
        responseObj.cookies.set(name, value, { 
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 0 // Expire immediately
        });
      });
      
      return responseObj;
    }
    
    return NextResponse.json({ success: false, error: 'No logout URL found' }, { status: 400 });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 