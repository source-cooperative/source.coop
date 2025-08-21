# DynamoDB Migration Documentation

This documentation describes the migration process from the old DynamoDB schema to the new schema for Source.coop.

## Overview

The migration involves updating two main DynamoDB tables:
1. `sc-accounts` → `sc-accounts` (schema update only)
2. `sc-repositories` → `sc-repositories` (schema update only)

The new schema provides:
- Better type safety and validation
- Improved indexing for common queries
- Enhanced features for organization management
- Better metadata handling
- Improved data organization

## Documentation Structure

- [Overview and Planning](./overview.md) - High-level migration plan and phases
- [Schema Changes](./schema-changes.md) - Detailed comparison of old and new schemas
- [Migration Scripts](./scripts.md) - Migration and validation scripts
- [Deployment Guide](./deployment.md) - Step-by-step deployment instructions
- [Rollback Plan](./rollback.md) - Procedures for handling issues and rollback
- [Validation](./validation.md) - Data validation procedures and checks

## Timeline

Estimated timeline for the migration:
1. Preparation: 1 day
2. Migration Script Development: 2 days
3. Testing: 2 days
4. Deployment: 1 day
5. Monitoring: 1 week
6. Cleanup: 1 day

Total: ~2 weeks

## Prerequisites

- AWS CLI installed
- Access to AWS DynamoDB
- Access to S3 bucket for backups
- Local development environment set up
- Test environment available

## Getting Started

1. Review the [Overview and Planning](./overview.md) document
2. Understand the [Schema Changes](./schema-changes.md)
3. Follow the [Deployment Guide](./deployment.md) for implementation
4. Use the [Validation](./validation.md) procedures to ensure data integrity 