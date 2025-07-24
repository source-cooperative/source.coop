import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { getApiSession } from "@/lib/api/utils";
import { AccountType } from "@/types/account";
import { ExtendedSession } from "@/types/session";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    // Verify the user is authenticated
    const session = (await getApiSession(request)) as ExtendedSession;
    if (!session?.active) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data from session
    if (!session.identity) {
      return NextResponse.json(
        { error: "No identity found in session" },
        { status: 400 }
      );
    }

    const userId = session.identity.id;
    const email = session.identity.traits.email;

    // Create the account in our database
    const accountData = {
      ...data,
      email,
      ory_id: userId,
      type: AccountType.INDIVIDUAL,
    };

    const response = await fetch(`${CONFIG.auth.api.backendUrl}/api/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(accountData),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || "Failed to create account" },
        { status: response.status }
      );
    }

    const account = await response.json();
    return NextResponse.json(account);
  } catch (error) {
    console.error("Account creation error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
