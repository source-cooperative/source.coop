import { NextRequest, NextResponse } from 'next/server';
import { getDynamoDb } from '@/lib/clients';
import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { IndividualAccount } from '@/types';
import { updateOryIdentity } from '@/lib/ory';
import { fetchAccount } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Log the request headers to debug session issues
    console.log('Received onboarding request with headers:', {
      contentType: request.headers.get('content-type'),
      accept: request.headers.get('accept'),
      cookie: !!request.headers.get('cookie'), // Log presence only, not the actual value
      host: request.headers.get('host')
    });

    const { account_id, name, ory_id, email } = await request.json();
    console.log('Starting onboarding process:', { 
      account_id, 
      name, 
      hasOryId: !!ory_id, 
      oryIdLength: ory_id?.length || 0,
      email 
    });

    if (!ory_id) {
      console.error('Missing ory_id in request');
      return NextResponse.json(
        { error: 'Invalid request: missing ory_id' },
        { status: 400 }
      );
    }

    // Check if account already exists
    const existingAccount = await fetchAccount(account_id);
    if (existingAccount) {
      console.log('Account already exists:', { account_id });
      return NextResponse.json(
        { error: 'This username is already taken' },
        { status: 400 }
      );
    }

    // Create the account in DynamoDB
    const newAccount: IndividualAccount = {
      account_id,
      name,
      type: 'individual',
      ory_id,
      email,
      email_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log('Attempting to create account in DynamoDB:', newAccount);
    
    // Save to DynamoDB
    const dynamoDb = getDynamoDb();
    try {
      await dynamoDb.send(new PutCommand({
        TableName: "Accounts",
        Item: newAccount
      }));
      console.log('Successfully created account in DynamoDB:', { account_id, type: 'individual' });
    } catch (dbError) {
      console.error('DynamoDB error:', dbError);
      throw dbError;
    }
    
    // Only try to update Ory identity if we have the required environment variables
    if (process.env.ORY_API_URL && process.env.ORY_ACCESS_TOKEN) {
      console.log('Attempting to update Ory identity:', { 
        hasApiUrl: !!process.env.ORY_API_URL,
        hasAccessToken: !!process.env.ORY_ACCESS_TOKEN,
        oryId: ory_id 
      });
      
      try {
        // Update Ory identity using the admin API
        await updateOryIdentity(ory_id, {
          metadata_public: {
            account_id: account_id
          }
        });
        console.log('Successfully updated Ory identity');
      } catch (oryError) {
        console.error('Ory identity update failed:', oryError);
        
        // If Ory update fails, delete the account from DynamoDB
        try {
          await dynamoDb.send(new DeleteCommand({
            TableName: "Accounts",
            Key: { 
              account_id,
              type: 'individual'
            }
          }));
          console.log('Cleaned up DynamoDB account after Ory update failure');
        } catch (cleanupError) {
          console.error('Failed to clean up DynamoDB account:', cleanupError);
        }
        
        return NextResponse.json(
          { 
            error: 'Failed to update user profile',
            details: oryError instanceof Error ? oryError.message : 'Unknown Ory error'
          },
          { status: 500 }
        );
      }
    } else {
      console.warn('Skipping Ory identity update - missing environment variables');
    }
    
    return NextResponse.json({ 
      success: true, 
      account_id, 
      message: 'Welcome to Source! Your account has been created successfully.',
      notification: {
        type: 'success',
        title: 'Welcome to Source',
        message: 'Your account has been set up successfully.'
      }
    });
  } catch (error) {
    console.error('Error in onboarding:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes('ConditionalCheckFailedException')) {
        return NextResponse.json(
          { error: 'This username is already taken' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to create account',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 