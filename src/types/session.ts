import type { Session, Identity } from '@ory/client';

export interface SessionMetadata {
  account_id?: string;
  is_admin?: boolean;
}

export interface SessionWithMetadata extends Session {
  identity?: Identity & {
    metadata_public?: SessionMetadata;
  };
} 