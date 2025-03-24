import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { CONFIG } from '@/lib/config';

const ORY_BASE_URL = CONFIG.auth.kratosUrl;

export async function POST() {
  console.log('DEPRECATED: /api/auth/logout endpoint is no longer used. The Ory SDK is now used directly for logout per CURSOR_RULES guidelines.');
  
  return NextResponse.json(
    { error: 'This endpoint is deprecated. The client should use the Ory SDK directly.' },
    { status: 410 }  // 410 Gone status
  );
} 