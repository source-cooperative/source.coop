import { NextRequest, NextResponse } from 'next/server';
import { getDynamoDb } from '@/lib/clients';
import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { IndividualAccount } from '@/types';
import { Configuration, FrontendApi } from '@ory/client';
import { CONFIG } from '@/lib/config';
import { updateOryIdentity } from '@/lib/ory';

// Initialize Ory client
const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4000',
    baseOptions: {
      withCredentials: true,
    }
  })
);

export async function POST(request: NextRequest) {
  try {
    const { account_id, name } = await request.json();

    // Get session using Ory client with cookie from request
    const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4000'}/sessions/whoami`, {
      method: 'GET',
      headers: {
        Cookie: request.headers.get('cookie') || '',
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    if (!sessionResponse.ok) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const session = await sessionResponse.json();
    if (!session?.identity) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const oryId = session.identity.id;
    const email = session.identity.traits.email || '';

    // Create the account in DynamoDB
    const newAccount: IndividualAccount = {
      account_id,
      name,
      type: 'individual',
      ory_id: oryId,
      email,
      email_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Save to DynamoDB
    const dynamoDb = getDynamoDb();
    await dynamoDb.send(new PutCommand({
      TableName: "Accounts",
      Item: newAccount,
      ConditionExpression: "attribute_not_exists(account_id)",
    }));
    
    try {
      // Update Ory identity using the admin API
      await updateOryIdentity(oryId, {
        metadata_public: {
          account_id: account_id
        }
      });
    } catch (oryError) {
      // If Ory update fails, delete the account from DynamoDB
      await dynamoDb.send(new DeleteCommand({
        TableName: "Accounts",
        Key: { account_id }
      }));
      
      console.error('Failed to update Ory identity:', oryError);
      return NextResponse.json(
        { 
          error: 'Failed to update user profile',
          details: oryError instanceof Error ? oryError.message : 'Unknown Ory error'
        },
        { status: 500 }
      );
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
    console.error('Error in onboarding:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 