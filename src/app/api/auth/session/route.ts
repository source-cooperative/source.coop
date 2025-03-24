import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { CONFIG } from '@/lib/config';

const ORY_BASE_URL = CONFIG.auth.kratosUrl;

export async function GET() {
  console.log('DEPRECATED: /api/auth/session endpoint is no longer used. The Ory SDK is now used directly for session management per CURSOR_RULES guidelines.');
  
  return NextResponse.json(
    { error: 'This endpoint is deprecated. The client should use the Ory SDK directly.' },
    { status: 410 }  // 410 Gone status
  );
} 