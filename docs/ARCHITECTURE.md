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
}
```

### Repositories
```