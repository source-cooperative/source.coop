import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  // Get all cookies as a string for debugging
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  
  return NextResponse.json({
    cookieHeader
  });
} 