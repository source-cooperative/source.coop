# Source.coop Architecture

## Overview
Source.coop is a platform for hosting and managing scientific data repositories. It provides a simple interface for organizations and individuals to store, share, and discover datasets.

## Core Features
- **Account Management**
  - Individual accounts for researchers and data scientists
  - Organization accounts for institutions and teams
  - Profile management with avatars and contact information

- **Repository Management**
  - Create and manage data repositories
  - Browse repository contents
  - View file metadata and details
  - Support for STAC catalogs and metadata

- **Storage**
  - Local file storage for development
  - Organized by account/repository structure
  - Metadata tracking for files and directories
  - Support for large datasets

- **Authentication**
  - User authentication via Ory Kratos
  - Session management
  - Protected routes and resources

## Data Model

### Accounts
```typescript
interface BaseAccount {
  account_id: string;
  name: string;
  type: 'individual' | 'organization';
  description?: string;
  created_at: string;
  updated_at: string;
}

interface IndividualAccount extends BaseAccount {
  type: 'individual';
  email: string;
  orcid?: string;
}

interface OrganizationalAccount extends BaseAccount {
  type: 'organization';
  owner_account_id: string;
  admin_account_ids: string[];
  member_account_ids?: string[];
  ror_id?: string;
  logo_svg?: string;
}
```

### Repositories
```typescript
interface Repository {
  repository_id: string;
  account_id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
```

### Storage Objects
```typescript
interface RepositoryObject {
  id: string;
  repository_id: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
  mime_type: string;
  created_at: string;
  updated_at: string;
  checksum: string;
  metadata: Record<string, unknown>;
}
```

## Storage Architecture

### Database (DynamoDB)
- Local DynamoDB for development
- Tables:
  - `Accounts`: User and organization profiles
  - `Repositories`: Repository metadata and ownership

### File Storage
- Local filesystem for development
- Organized structure:
  ```
  /storage
    /{account_id}
      /{repository_id}
        /{files}
        /.source-metadata.json
  ```
- Metadata stored in `.source-metadata.json` for each repository

## Authentication
- Ory Kratos for user authentication
- Session management via HTTP cookies
- Protected routes using Next.js middleware

## Key Components

### Pages
- `src/app/` - Next.js pages and routes
  - `page.tsx` - Homepage with repository list
  - `[account_id]/page.tsx` - Account profile
  - `[account_id]/[repository_id]/page.tsx` - Repository view
  - `[account_id]/[repository_id]/[...path]/page.tsx` - File browser

### Components
- `src/components/features/`
  - `repositories/` - Repository listing and management
  - `profiles/` - Account profile displays
  - `markdown/` - Markdown rendering
- `src/components/layout/` - Page layout components
- `src/components/core/` - Reusable UI primitives

### Data Operations
- `src/lib/db/operations.ts` - DynamoDB operations
- `src/lib/storage/local.ts` - File storage operations
- `src/lib/clients/` - Client implementations

## Development Setup
1. Local DynamoDB running on port 8000
2. Local file storage in `./test-storage`
3. Ory Kratos for authentication
4. Environment variables in `.env.local`

## Future Considerations
- Support for cloud storage providers
- Repository access control
- Dataset versioning
- API endpoints for programmatic access 