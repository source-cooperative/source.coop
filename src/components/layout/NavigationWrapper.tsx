import { ory } from '@/lib/ory';
import { Navigation } from './Navigation';
import type { Session, Identity } from '@ory/client';

interface ExtendedIdentity extends Identity {
  metadata_public?: {
    account_id?: string;
    is_admin?: boolean;
  };
}

interface SessionWithMetadata extends Session {
  identity?: ExtendedIdentity;
}

export async function NavigationWrapper() {
  const { data: session } = await ory.toSession();
  return <Navigation initialSession={session as SessionWithMetadata} />;
} 