import { NextRequest, NextResponse } from "next/server";
import { serverOry } from "@/lib/ory";
import { fetchAccount, updateAccount } from "@/lib/db/operations_v2";
import { getDynamoDb } from "@/lib/clients";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import type { ExtendedSession } from "@/lib/ory";
import { getServerSession } from "@ory/nextjs/app";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    // Await params before using, per Next.js 15+ requirements
    const { account_id } = await params;

    console.log("API: Fetching account for ID:", account_id);

    // Fetch account from DynamoDB
    const account = await fetchAccount(account_id);
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
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        // Use the cookie header for session verification
        const { data: session } = (await serverOry.toSession({
          cookie: cookieHeader,
        })) as { data: ExtendedSession };

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
  request: Request,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const session = await getServerSession();
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

    const { account_id } = await params;
    console.log("API: Updating account:", account_id);

    // Only allow the user to update their own account
    const sessionAccountId = (
      session?.identity?.metadata_public as { account_id?: string }
    )?.account_id;

    if (!session.active) {
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
    const isAdmin = !!(
      session?.identity?.metadata_public as { is_admin?: boolean }
    )?.is_admin;
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
    const success = await updateAccount(account);

    if (!success) {
      console.error("Failed to update account:", {
        account_id: account_id,
        account_type: account.type,
        account_data: account,
      });
      return NextResponse.json(
        { error: "Failed to update account in database" },
        { status: 400 }
      );
    }

    // Fetch and return the updated account
    const updatedAccount = await fetchAccount(account_id);
    if (!updatedAccount) {
      return NextResponse.json(
        { error: "Account not found after update" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedAccount);
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
    const { data: session } = (await serverOry.toSession()) as {
      data: ExtendedSession;
    };
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
    const account = await fetchAccount(account_id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Delete the account from DynamoDB
    const dynamoDb = getDynamoDb();
    await dynamoDb.send(
      new DeleteCommand({
        TableName: "Accounts",
        Key: {
          account_id,
          type: account.type,
        },
      })
    );

    // Log out the user if they're deleting their own account
    if (sessionAccountId === account_id) {
      await serverOry.createBrowserLogoutFlow();
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
