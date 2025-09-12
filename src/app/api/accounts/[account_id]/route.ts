import { NextRequest, NextResponse } from "next/server";
import { accountsTable } from "@/lib/clients/database";
import { getApiSession } from "@/lib/api/utils";
import { LOGGER } from "@/lib";
import { isAdmin } from "@/lib/api/authz";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    // Await params before using, per Next.js 15+ requirements
    const { account_id } = await params;

    LOGGER.info("API: Fetching account for ID", {
      operation: "accounts.GET",
      context: "account fetching",
      metadata: { account_id },
    });

    // Fetch account from DynamoDB
    const account = await accountsTable.fetchById(account_id);
    LOGGER.info("API: Account fetch result", {
      operation: "accounts.GET",
      context: "account fetching",
      metadata: {
        found: !!account,
        accountId: account_id,
        accountType: account?.type,
      },
    });

    if (!account) {
      LOGGER.info("API: Account not found", {
        operation: "accounts.GET",
        context: "account fetching",
        metadata: { account_id },
      });
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
    const session = await getApiSession(request);
    const isAuthenticated = !!session?.account && !session.account?.disabled;
    const isAuthenticatedUser = session?.account?.account_id === account_id;
    const sessionAccountId = session?.account?.account_id;

    LOGGER.debug("API: Auth status", {
      operation: "accounts.GET",
      context: "session validation",
      metadata: {
        isAuthenticated,
        isAuthenticatedUser,
        isAdmin: isAdmin(session),
        sessionAccountId,
        requestedAccountId: account_id,
      },
    });

    // Filter account data based on authentication status
    // If the user is viewing their own account or is an admin, include all fields
    if (isAuthenticatedUser || isAdmin(session)) {
      LOGGER.info("API: Returning full account data", {
        operation: "accounts.GET",
        context: "response",
        metadata: { account_id },
      });
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

    LOGGER.info("API: Returning public account data", {
      operation: "accounts.GET",
      context: "response",
      metadata: { account_id },
    });
    return NextResponse.json(publicAccountData);
  } catch (error) {
    LOGGER.error("Error fetching account", {
      operation: "accounts.GET",
      context: "account fetching",
      error: error,
    });
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
    const session = await getApiSession(request);
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

    if (session.account?.disabled) {
      return NextResponse.json(
        {
          error: {
            code: "401",
            message: "Unauthorized: Account disabled",
            status: "Unauthorized",
          },
        },
        { status: 401 }
      );
    }

    const { account_id } = await params;

    const sessionAccountId = session?.account?.account_id;
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
    const isAuthenticatedUser = sessionAccountId === account_id;

    if (!isAuthenticatedUser && !isAdmin(session)) {
      LOGGER.warn("API: Unauthorized account update attempt", {
        operation: "accounts.PUT",
        context: "authorization",
        metadata: {
          sessionAccountId,
          targetAccountId: account_id,
          isAdmin: isAdmin(session),
        },
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
      ...(await request.json()),
      account_id,
      identity_id: session.identity_id,
    };

    // Update the account in DynamoDB
    try {
      const updatedAccount = await accountsTable.update(account);
      return NextResponse.json(updatedAccount);
    } catch (error) {
      LOGGER.error("Failed to update account", {
        operation: "accounts.PUT",
        context: "database operation",
        error: error,
        metadata: {
          account_id: account_id,
          account_type: account.type,
          account_data: account,
        },
      });
      return NextResponse.json(
        { error: "Failed to update account in database" },
        { status: 400 }
      );
    }
  } catch (error) {
    LOGGER.error("Error updating account", {
      operation: "accounts.PUT",
      context: "request processing",
      error: error,
    });
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

    // Verify session with Ory
    const session = await getApiSession(request);
    if (!session?.account || session.account?.disabled) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data from session
    if (!session?.identity_id) {
      return NextResponse.json(
        { error: "No identity found in session" },
        { status: 400 }
      );
    }

    // Verify the user is authorized (either deleting their own account or is an admin)
    const sessionAccountId = session.account?.account_id;

    if (
      !sessionAccountId ||
      (!isAdmin(session) && sessionAccountId !== account_id)
    ) {
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
      LOGGER.error("Failed to delete account", {
        operation: "accounts.DELETE",
        context: "database operation",
        error: error,
        metadata: { account_id },
      });
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
      deleted_by: isAdmin(session) ? "admin" : "self",
    });
  } catch (error) {
    LOGGER.error("Account deletion error", {
      operation: "accounts.DELETE",
      context: "request processing",
      error: error,
    });
    return NextResponse.json(
      {
        error: "Failed to delete account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
