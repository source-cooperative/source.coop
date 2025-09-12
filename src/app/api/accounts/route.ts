import { NextRequest, NextResponse } from "next/server";
import { CONFIG, LOGGER } from "@/lib";
import { getApiSession } from "@/lib/api/utils";
import { AccountType } from "@/types/account";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    // Verify the user is authenticated
    const session = await getApiSession(request);
    if (!session?.account || session.account?.disabled) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create the account in our database
    const accountData = {
      ...data,
      email: session.account.emails?.[0]?.address,
      ory_id: session.identity_id,
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
    LOGGER.error("Account creation error", {
      operation: "accounts.POST",
      context: "account creation",
      error: error,
    });
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
