# System Architecture Overview

## Introduction
Source.coop is a platform for hosting and managing scientific data repositories. It provides a simple interface for organizations and individuals to store, share, and discover datasets.

## Core Features

### Account Management
- Individual accounts for researchers and data scientists
- Organization accounts for institutions and teams
- Profile management with avatars and contact information

### Repository Management
- Create and manage data repositories
- Browse repository contents
- View file metadata and details
- Support for STAC catalogs and metadata

### Storage
- Local file storage for development
- Organized by account/repository structure
- Metadata tracking for files and directories
- Support for large datasets

### Authentication
- User authentication via Ory Kratos
- Session management
- Protected routes and resources

## System Components

### Frontend
- Next.js 13+ with App Router
- Radix UI for component primitives
- Server-first architecture
- Progressive enhancement

### Backend
- Next.js API routes
- Local DynamoDB for development
- Local filesystem storage
- Ory Kratos for authentication

### Data Layer
- DynamoDB for metadata and relationships
- Filesystem for data storage
- Metadata tracking system
- STAC catalog support

## Key Design Decisions

### Server-First Architecture
- Start with Server Components
- Convert to Client Components only when needed
- Progressive enhancement
- Optimized data fetching

### Data Integrity
- Exact data preservation
- Path structure maintenance
- Progressive metadata handling
- Data proxy service integration

### Performance
- Efficient data fetching
- Precise queries
- Data transformation at source
- Caching strategy

## Development Guidelines

### Component Structure
```
src/components/
├── core/      # UI primitives
├── display/   # Formatting
├── layout/    # Page structure
└── features/  # Domain logic
```

### Data Operations
- Type-safe operations
- Precise queries
- Source-side transformations
- Efficient caching

### Testing Strategy
- Comprehensive unit tests
- Integration tests
- Performance benchmarks
- Accessibility testing

## Future Considerations

### Storage
- Cloud storage providers
- Distributed storage
- Data replication
- Backup strategies

### Security
- Access control
- Data encryption
- Audit logging
- Compliance features

### Integration
- API endpoints
- Webhook support
- External integrations
- Data export/import

For detailed information about specific aspects of the architecture, see:
- [Data Model](data-model.md)
- [Storage Architecture](storage.md)
- [Authentication](authentication.md) 