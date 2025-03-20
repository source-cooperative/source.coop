import { NextRequest, NextResponse } from 'next/server';

// In a real implementation, this would query your database
// Mock data for demonstration
const RESERVED_USERNAMES = ['admin', 'moderator', 'root', 'superuser', 'system'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username')?.toLowerCase();

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    // Basic username validation
    if (username.length < 3) {
      return NextResponse.json(
        { available: false, error: 'Username must be at least 3 characters' },
        { status: 200 }
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json(
        { available: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' },
        { status: 200 }
      );
    }

    // Check against reserved names
    if (RESERVED_USERNAMES.includes(username)) {
      return NextResponse.json(
        { available: false, error: 'This username is reserved' },
        { status: 200 }
      );
    }

    // In a real implementation, check against database
    // For now, randomly return available or not for demonstration
    // const isAvailable = await db.accounts.findUnique({ where: { account_id: username } }) === null;
    
    // Simulate database check with 80% chance of username being available
    const isAvailable = Math.random() > 0.2;

    return NextResponse.json({ available: isAvailable });
  } catch (error) {
    console.error('Error checking username availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 