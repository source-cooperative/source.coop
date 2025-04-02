# Deployment Guide

This document provides step-by-step instructions for deploying the DynamoDB migration.

## Prerequisites

1. AWS CLI installed and configured
2. Access to AWS DynamoDB and S3
3. Local development environment set up
4. Test environment available
5. Maintenance window scheduled

## Pre-Deployment Checklist

### 1. Backup Current Data
```bash
# Export current tables
aws dynamodb export-table-to-point-in-time \
    --table-name sc-accounts \
    --s3-bucket radiant-assets \
    --export-time $(date -u +"%Y-%m-%dT%H:%M:%SZ")

aws dynamodb export-table-to-point-in-time \
    --table-name sc-repositories \
    --s3-bucket radiant-assets \
    --export-time $(date -u +"%Y-%m-%dT%H:%M:%SZ")
```

### 2. Verify Environment
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify S3 bucket access
aws s3 ls s3://radiant-assets/

# Check DynamoDB access
aws dynamodb list-tables
```

### 3. Test Environment Setup
1. Create test tables
2. Run migration scripts
3. Validate data
4. Test application with new schema

## Deployment Steps

### 1. Schedule Maintenance Window
- Notify users of downtime
- Set up monitoring
- Prepare rollback plan

### 2. Stop Application
```bash
# Stop the application
# (Implementation depends on deployment method)
```

### 3. Create New Tables
```bash
# Create new tables
npx tsx scripts/migration/create-tables.ts

# Verify tables are created
aws dynamodb describe-table --table-name Accounts_v2
aws dynamodb describe-table --table-name Repositories_v2
```

### 4. Run Migration
```bash
# Run migration script
npx tsx scripts/migration/migrate-data.ts

# Monitor progress
# Check CloudWatch logs
```

### 5. Validate Data
```bash
# Run validation script
npx tsx scripts/migration/validate.ts

# Check for any errors
# Verify data integrity
```

### 6. Update Application Configuration
1. Update DynamoDB table names
2. Update environment variables
3. Update application code

### 7. Start Application
```bash
# Start the application with new configuration
# (Implementation depends on deployment method)
```

### 8. Monitor Application
- Watch error rates
- Monitor performance
- Check user feedback

## Rollback Procedure

If issues occur during deployment:

1. Stop application
2. Run rollback script:
```bash
npx tsx scripts/migration/rollback.ts
```
3. Revert application configuration
4. Start application with old configuration

## Post-Deployment Tasks

### 1. Verify Application
- Check all features
- Verify data access
- Test user workflows

### 2. Monitor Performance
- Watch DynamoDB metrics
- Monitor application performance
- Check error rates

### 3. Cleanup
After successful deployment (1 week):
1. Delete old tables
2. Remove old backups
3. Update documentation

## Troubleshooting

### Common Issues

1. **Table Creation Failures**
   - Check IAM permissions
   - Verify table names
   - Check for existing tables

2. **Migration Errors**
   - Check data format
   - Verify transformation rules
   - Monitor DynamoDB limits

3. **Validation Failures**
   - Review validation rules
   - Check data integrity
   - Fix data issues

4. **Application Issues**
   - Check configuration
   - Verify table access
   - Monitor error logs

### Support Contacts

- Database Team: [Contact Info]
- Application Team: [Contact Info]
- DevOps Team: [Contact Info]

## Success Criteria

1. All data successfully migrated
2. No data loss or corruption
3. Application functioning normally
4. Performance metrics within acceptable range
5. No user-reported issues
6. All tests passing

## Documentation Updates

After successful deployment:
1. Update API documentation
2. Update development guides
3. Update deployment procedures
4. Archive old documentation 