import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { Account } from '@/types/account_v2';

const client = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY || 'local'
  }
});

const docClient = DynamoDBDocument.from(client);

interface OldAccount {
  account_id: string;
  type: 'individual' | 'organization';
  name: string;
  email?: string;
  description?: string;
  websites?: { url: string }[];
  orcid?: string;
  created_at: string;
  updated_at: string;
  ory_id: string;
  owner_account_id?: string;
  admin_account_ids?: string[];
  member_account_ids?: string[];
}

async function migrateAccount(oldAccount: OldAccount): Promise<Account> {
  const now = new Date().toISOString();
  
  // Base account data
  const baseAccount = {
    account_id: oldAccount.account_id,
    type: oldAccount.type,
    name: oldAccount.name,
    emails: oldAccount.email ? [{
      address: oldAccount.email,
      verified: false,  // Will need to be verified in new system
      is_primary: true,
      added_at: now
    }] : [],
    created_at: oldAccount.created_at || now,
    updated_at: oldAccount.updated_at || now,
    disabled: false,
    flags: [],
    metadata_public: {
      location: undefined,
      bio: oldAccount.description,
      domains: []
    },
    metadata_private: {
      identity_id: oldAccount.ory_id
    }
  };

  // Add type-specific fields
  if (oldAccount.type === 'individual') {
    return {
      ...baseAccount,
      type: 'individual' as const,
      metadata_public: {
        ...baseAccount.metadata_public,
        orcid: oldAccount.orcid
      }
    };
  } else {
    return {
      ...baseAccount,
      type: 'organization' as const,
      metadata_public: {
        ...baseAccount.metadata_public,
        ror_id: undefined // No ROR ID in old data
      }
    };
  }
}

async function migrateAccounts() {
  try {
    // Scan old accounts table
    const { Items: oldAccounts = [] } = await docClient.send(new ScanCommand({
      TableName: "Accounts"
    }));

    console.log(`Found ${oldAccounts.length} accounts to migrate`);

    // Migrate each account
    for (const oldAccount of oldAccounts) {
      try {
        const newAccount = await migrateAccount(oldAccount as OldAccount);
        
        // Write to new table
        await docClient.send(new PutCommand({
          TableName: "sc-accounts",
          Item: newAccount,
          ConditionExpression: "attribute_not_exists(account_id)"
        }));
        
        console.log(`✓ Migrated account ${oldAccount.account_id}`);
      } catch (e) {
        console.error(`✗ Failed to migrate account ${oldAccount.account_id}:`, e);
      }
    }

    console.log('Migration completed');
  } catch (e) {
    console.error('Migration failed:', e);
  }
}

// Run migration
migrateAccounts(); 