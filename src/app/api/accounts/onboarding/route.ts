import { NextRequest, NextResponse } from "next/server";
import { updateOryIdentity } from "@/lib/ory";
import { accountsTable } from "@/lib/clients/database";
import { CONFIG, LOGGER } from "@/lib";
import { AccountType } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Log the request headers to debug session issues
    LOGGER.info("Received onboarding request with headers", {
      operation: "onboarding.POST",
      context: "request processing",
      metadata: {
        contentType: request.headers.get("content-type"),
        accept: request.headers.get("accept"),
        cookie: !!request.headers.get("cookie"), // Log presence only, not the actual value
        host: request.headers.get("host"),
      },
    });

    const { account_id, name, ory_id, email } = await request.json();
    LOGGER.info("Starting onboarding process", {
      operation: "onboarding.POST",
      context: "request processing",
      metadata: {
        account_id,
        name,
        hasOryId: !!ory_id,
        oryIdLength: ory_id?.length || 0,
        email,
      },
    });

    if (!ory_id) {
      LOGGER.error("Missing ory_id in request", {
        operation: "onboarding.POST",
        context: "request validation",
        metadata: { account_id, name, email },
      });
      return NextResponse.json(
        { error: "Invalid request: missing ory_id" },
        { status: 400 }
      );
    }

    // Check if account already exists
    const existingAccount = await accountsTable.fetchById(account_id);
    if (existingAccount) {
      LOGGER.info("Account already exists", {
        operation: "onboarding.POST",
        context: "account validation",
        metadata: { account_id },
      });
      return NextResponse.json(
        { error: "This username is already taken" },
        { status: 400 }
      );
    }

    // Create the account in DynamoDB
    const newAccount: IndividualAccount = {
      account_id,
      type: AccountType.INDIVIDUAL,
      name,
      emails: [
        {
          address: email,
          verified: false,
          is_primary: true,
          added_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      disabled: false,
      flags: [],
      metadata_public: {
        domains: [],
      },
      metadata_private: {},
      identity_id: ory_id,
    };

    LOGGER.info("Attempting to create account in DynamoDB", {
      operation: "onboarding.POST",
      context: "database operation",
      metadata: { newAccount },
    });

    // Save to DynamoDB
    try {
      await accountsTable.create(newAccount);
      LOGGER.info("Successfully created account in DynamoDB", {
        operation: "onboarding.POST",
        context: "database operation",
        metadata: {
          account_id,
          type: "individual",
        },
      });
    } catch (dbError) {
      LOGGER.error("DynamoDB error", {
        operation: "onboarding.POST",
        context: "database operation",
        error: dbError,
      });
      throw dbError;
    }

    // Only try to update Ory identity if we have the required environment variables
    if (CONFIG.auth.api.backendUrl && CONFIG.auth.accessToken) {
      LOGGER.info("Attempting to update Ory identity", {
        operation: "onboarding.POST",
        context: "Ory operation",
        metadata: {
          hasApiUrl: !!CONFIG.auth.api.backendUrl,
          hasAccessToken: !!CONFIG.auth.accessToken,
          oryId: ory_id,
        },
      });

      try {
        // Update Ory identity using the admin API
        await updateOryIdentity(ory_id, {
          metadata_public: {
            account_id: account_id,
          },
        });
        LOGGER.info("Successfully updated Ory identity", {
          operation: "onboarding.POST",
          context: "Ory operation",
          metadata: { ory_id },
        });
      } catch (oryError) {
        LOGGER.error("Ory identity update failed", {
          operation: "onboarding.POST",
          context: "Ory operation",
          error: oryError,
        });

        // If Ory update fails, delete the account from DynamoDB
        try {
          await accountsTable.delete({
            account_id,
            type: AccountType.INDIVIDUAL,
          });
          LOGGER.info("Cleaned up DynamoDB account after Ory update failure", {
            operation: "onboarding.POST",
            context: "cleanup operation",
            metadata: { account_id },
          });
        } catch (cleanupError) {
          LOGGER.error("Failed to clean up DynamoDB account", {
            operation: "onboarding.POST",
            context: "cleanup operation",
            error: cleanupError,
          });
        }

        return NextResponse.json(
          {
            error: "Failed to update user profile",
            details:
              oryError instanceof Error
                ? oryError.message
                : "Unknown Ory error",
          },
          { status: 500 }
        );
      }
    } else {
      LOGGER.warn(
        "Skipping Ory identity update - missing environment variables",
        {
          operation: "onboarding.POST",
          context: "configuration",
          metadata: {
            hasBackendUrl: !!CONFIG.auth.api.backendUrl,
            hasAccessToken: !!CONFIG.auth.accessToken,
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      account_id,
      message: "Welcome to Source! Your account has been created successfully.",
      notification: {
        type: "success",
        title: "Welcome to Source",
        message: "Your account has been set up successfully.",
      },
    });
  } catch (error) {
    LOGGER.error("Error in onboarding", {
      operation: "onboarding.POST",
      context: "request processing",
      error: error,
      metadata: {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes("ConditionalCheckFailedException")) {
        return NextResponse.json(
          { error: "This username is already taken" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to create account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
