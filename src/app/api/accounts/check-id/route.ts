import { NextRequest, NextResponse } from "next/server";
import { accountsTable } from "@/lib/clients/database";
import { LOGGER } from "@/lib";

// Reserved usernames that cannot be used
const RESERVED_USERNAMES = [
  "admin",
  "moderator",
  "root",
  "superuser",
  "system",
  "api",
  "auth",
  "login",
  "logout",
  "register",
  "settings",
  "profile",
  "account",
  "help",
  "support",
  "about",
  "terms",
  "privacy",
  "security",
  "contact",
  "feedback",
  "status",
];

export async function PUT(request: NextRequest) {
  const account_id = (await request.json()).id;

  if (!account_id) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  try {
    // Basic validation
    if (account_id.length < 3) {
      return NextResponse.json(
        { available: false, error: "Username must be at least 3 characters" },
        { status: 400 }
      );
    }

    // Check if username is reserved
    if (RESERVED_USERNAMES.includes(account_id.toLowerCase())) {
      return NextResponse.json(
        {
          available: false,
          error: "This username is reserved and cannot be used",
        },
        { status: 400 }
      );
    }

    // Only allow lowercase alphanumeric characters, hyphens, and underscores
    if (!/^[a-z0-9_-]+$/.test(account_id)) {
      return NextResponse.json(
        { available: false, error: "Invalid username format" },
        { status: 400 }
      );
    }

    const account = await accountsTable.fetchById(account_id);
    return NextResponse.json({ available: !account });
  } catch (error) {
    LOGGER.error("Error checking username", {
      operation: "check-username.GET",
      context: "username validation",
      error: error,
      metadata: { username: account_id },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
