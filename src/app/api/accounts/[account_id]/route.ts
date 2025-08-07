import { NextRequest, NextResponse } from "next/server";
import { accountsTable } from "@/lib/clients/database";
import type { ExtendedSession } from "@/types/session";
import { getApiSession } from "@/lib/api/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    // Await params before using, per Next.js 15+ requirements
    const { account_id } = await params;

    console.log("API: Fetching account for ID:", account_id);

    // Fetch account from DynamoDB
    const account = await accountsTable.fetchById(account_id);
    console.log("API: Account fetch result:", {
      found: !!account,
      accountId: account_id,
      accountType: account?.type,
    });

    if (!account) {
      console.log("API: Account not found:", account_id);
      return NextResponse.json(
        {
          error: {
            code: "404",
            message: "Account not found",
            status: "Not Found",
          },
        },
        { status: 404 }
      );
    }

    // Try to get authentication status, but don't require it
    let isAuthenticated = false;
    let isAuthenticatedUser = false;
    let isAdmin = false;

    try {
      // Get all cookies from the request
      const session = (await getApiSession(request)) as ExtendedSession;
      if (session) {
        console.log("API: Session check:", {
          hasSession: !!session,
          isActive: session?.active,
          hasIdentity: !!session?.identity,
          sessionAccountId: session?.identity?.metadata_public?.account_id,
          requestedAccountId: account_id,
        });

        if (session?.active && session.identity) {
          isAuthenticated = true;
          const sessionAccountId =
            session.identity?.metadata_public?.account_id;
          isAuthenticatedUser = sessionAccountId === account_id;
          isAdmin = !!session.identity?.metadata_public?.is_admin;

          console.log("API: Auth status:", {
            isAuthenticated,
            isAuthenticatedUser,
            isAdmin,
            sessionAccountId,
            requestedAccountId: account_id,
          });
        }
      }
    } catch (authError) {
      // Log the actual error for debugging
      console.error("API: Auth error:", authError);
      console.log("User not authenticated, showing public account data only");
    }

    // Filter account data based on authentication status
    // If the user is viewing their own account or is an admin, include all fields
    if (isAuthenticatedUser || isAdmin) {
      console.log("API: Returning full account data:", account);
      // TODO: add verification status
      return NextResponse.json(account);
    }

    // For public views, only return public data
    const publicAccountData = {
      account_id: account.account_id,
      name: account.name,
      type: account.type,
      created_at: account.created_at,
      updated_at: account.updated_at,
      metadata_public: account.metadata_public,
      // TODO: add verification status
    };

    console.log("API: Returning public account data:", publicAccountData);
    return NextResponse.json(publicAccountData);
  } catch (error) {
    console.error("Error fetching account:", error);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const session = (await getApiSession(request)) as ExtendedSession;
    if (!session) {
      return NextResponse.json(
        {
          error: {
            code: "401",
            message: "Unauthorized: No cookie header",
            status: "Unauthorized",
          },
        },
        { status: 401 }
      );
    }

    // Only allow the user to update their own account
    const sessionAccountId = session?.identity?.metadata_public?.account_id;

    if (!session.active) {
      console.warn("API: Unauthorized: Session inactive: ", session);
      return NextResponse.json(
        {
          error: {
            code: "401",
            message: "Unauthorized: Session inactive",
            status: "Unauthorized",
          },
        },
        { status: 401 }
      );
    }

    if (!sessionAccountId) {
      return NextResponse.json(
        {
          error: {
            code: "401",
            message: "Unauthorized: No account linked to identity",
            status: "Unauthorized",
          },
        },
        { status: 401 }
      );
    }

    // Check if user is updating their own account or is an admin
    const { account_id } = await params;
    const isAdmin = !!session?.identity?.metadata_public?.is_admin;
    const isAuthenticatedUser = sessionAccountId === account_id;

    if (!isAuthenticatedUser && !isAdmin) {
      console.log("API: Unauthorized account update attempt:", {
        sessionAccountId,
        targetAccountId: account_id,
        isAdmin,
      });

      return NextResponse.json(
        {
          error: {
            code: "403",
            message: "Forbidden: Cannot update other accounts",
            status: "Forbidden",
          },
        },
        { status: 403 }
      );
    }

    const account = {
      metadata_private: {}, // TODO: not getting metadata_private from ory, why?
      ...(await request.json()),
    };

    // Verify the account_id matches the URL parameter
    if (account.account_id !== account_id) {
      return NextResponse.json(
        { error: "Account ID mismatch" },
        { status: 400 }
      );
    }

    // Update the account in DynamoDB
    try {
      console.log("API: Updating account:", account_id);
      console.log("API: Update data:", account);
      const updatedAccount = await accountsTable.update(account);
      return NextResponse.json(updatedAccount);
    } catch (error) {
      console.error(
        "Failed to update account:",
        {
          account_id: account_id,
          account_type: account.type,
          account_data: account,
        },
        error
      );
      return NextResponse.json(
        { error: "Failed to update account in database" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error updating account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const { account_id } = await params;

    // Get the session cookie from the request
    const sessionCookie = request.cookies.get("ory_kratos_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify session with Ory
    const session = (await getApiSession(request)) as ExtendedSession;
    if (!session?.active) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data from session
    if (!session?.identity) {
      return NextResponse.json(
        { error: "No identity found in session" },
        { status: 400 }
      );
    }

    // Verify the user is authorized (either deleting their own account or is an admin)
    const sessionAccountId = session.identity.metadata_public?.account_id;
    const isAdmin = session.identity.metadata_public?.is_admin === true;

    if (!sessionAccountId || (!isAdmin && sessionAccountId !== account_id)) {
      return NextResponse.json(
        { error: "You can only delete your own account" },
        { status: 403 }
      );
    }

    // Verify CSRF token if not an API request
    const csrfToken = request.headers.get("x-csrf-token");
    if (!request.headers.get("authorization") && !csrfToken) {
      return NextResponse.json(
        { error: "CSRF token missing" },
        { status: 403 }
      );
    }

    // Fetch the account first to verify it exists and get its type
    const account = await accountsTable.fetchById(account_id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Delete the account from DynamoDB
    try {
      await accountsTable.delete({ account_id, type: account.type });
    } catch (error) {
      console.error("Failed to delete account:", error);
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
      deleted_by: isAdmin ? "admin" : "self",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
