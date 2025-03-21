import { NextRequest, NextResponse } from 'next/server';
import { getDynamoDb } from '@/lib/clients';
import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { IndividualAccount } from '@/types';

const ORY_BASE_URL = process.env.ORY_BASE_URL || "http://localhost:4000";

export async function POST(request: NextRequest) {
  try {
    const { account_id, name } = await request.json();

    // Get session from cookie
    const sessionCookie = request.cookies.get('ory_kratos_session');
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    // Get session data from Ory
    const sessionResponse = await fetch(`${ORY_BASE_URL}/sessions/whoami`, {
      headers: {
        Cookie: `ory_kratos_session=${sessionCookie.value}`,
      },
    });

    if (!sessionResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const session = await sessionResponse.json();
    const oryId = session.identity.id;

    // Create the account in DynamoDB
    const newAccount: IndividualAccount = {
      account_id,
      name,
      type: 'individual',
      ory_id: oryId,
      email: session.identity.traits.email || '',
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
    
    // Now update Ory identity to include account_id in the metadata
    const updateResponse = await fetch(`${ORY_BASE_URL}/admin/identities/${oryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ORY_ADMIN_API_KEY || 'test'}`,
      },
      body: JSON.stringify({
        schema_id: 'default',
        traits: session.identity.traits,
        metadata_public: {
          ...session.identity.metadata_public,
          account_id,
        },
        metadata_admin: {
          ...session.identity.metadata_admin,
          completed_onboarding: true,
          onboarding_date: new Date().toISOString(),
        },
      }),
    });
    
    if (!updateResponse.ok) {
      // If Ory update fails, delete the account from DynamoDB
      await dynamoDb.send(new DeleteCommand({
        TableName: "Accounts",
        Key: { account_id }
      }));
      
      console.error('Failed to update Ory identity:', await updateResponse.text());
      return NextResponse.json(
        { error: 'Failed to update user profile' },
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 