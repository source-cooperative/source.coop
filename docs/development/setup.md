# Development Environment Setup

This guide will help you set up your local development environment for Source.coop.

## Prerequisites

### Required Software
- Node.js 18 or higher
- Docker and Docker Compose
- Git
- AWS CLI (for DynamoDB operations)
- VS Code (recommended)

### System Requirements
- 8GB RAM minimum
- 20GB free disk space
- macOS, Linux, or Windows 10/11

## Initial Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/source.coop.git
   cd source.coop
   ```

2. **Environment Configuration**
   ```bash
   # Copy the example environment file
   cp .env.example .env.local
   
   # Edit .env.local with your configuration
   # Required variables:
   # - NEXT_PUBLIC_ORY_URL
   # - NEXT_PUBLIC_ORY_SDK_URL
   # - NEXT_PUBLIC_ORY_UI_URL
   # - STORAGE_BASE_DIR
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Start Development Services**
   ```bash
   # Start DynamoDB and Ory Kratos
   docker-compose up -d
   ```

## DynamoDB Setup

The application uses DynamoDB for data storage. We've created several scripts to make working with local DynamoDB easier.

### Managing DynamoDB

```bash
# Start DynamoDB and initialize if needed
npm run start-dynamodb

# Check if DynamoDB is running
npm run check-dynamodb

# Initialize tables and sample data
npm run init-local
```

### Automatic Setup

When you run `npm run dev`, the following happens automatically:

1. The system checks if DynamoDB is running (`npm run check-dynamodb`)
2. If DynamoDB isn't running, it starts it automatically (`npm run start-dynamodb`)
3. If tables don't exist, you'll be prompted to initialize them
4. If tables already exist, initialization is skipped

### DynamoDB Tables

The application uses two main tables:
- `Accounts` - Stores user and organization account information
- `Repositories` - Stores repository metadata

### Manual DynamoDB Operations

If you need to interact with DynamoDB directly:

```bash
# List tables
aws dynamodb list-tables --endpoint-url http://localhost:8000

# Scan table contents (view data)
aws dynamodb scan --table-name Accounts --endpoint-url http://localhost:8000

# Delete a table (reset data)
aws dynamodb delete-table --table-name Accounts --endpoint-url http://localhost:8000
```

## Development Workflow

### Starting the Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:3000`

### Available Scripts
```bash
# Development
npm run dev         # Start development server
npm run lint       # Run ESLint
npm run type-check # Run TypeScript checks

# Testing
npm run test       # Run tests
npm run test:watch # Run tests in watch mode

# Code Quality
npm run format     # Format code with Prettier
npm run lint:fix   # Fix ESLint issues

# Database
npm run start-dynamodb  # Start local DynamoDB
npm run check-dynamodb  # Check if DynamoDB is running
npm run init-local      # Initialize database tables
```
## IDE Setup

### VS Code Extensions
Recommended extensions for development:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- GitLens
- Docker

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Troubleshooting

### Common Issues

1. **Docker Services Not Starting**
   ```bash
   # Check Docker status
   docker ps
   
   # Restart services
   docker-compose down
   docker-compose up -d
   ```

2. **Port Conflicts**
   - Ensure ports 3000, 8000, and 4433 are available
   - Check for running instances of the development server

3. **Environment Variables**
   - Verify `.env.local` exists and is properly configured
   - Restart the development server after changes

4. **TypeScript Errors**
   ```bash
   # Clear TypeScript cache
   rm -rf .next
   npm run type-check
   ```

5. **DynamoDB Connection Issues**
   ```bash
   # Check if DynamoDB is running
   docker ps | grep dynamodb

   # Stop existing container and restart
   docker stop dynamodb-local
   docker rm dynamodb-local
   npm run start-dynamodb

   # Verify table structure
   aws dynamodb describe-table --table-name Accounts --endpoint-url http://localhost:8000
   ```

6. **DynamoDB Reset**
   If you need to completely reset your database:
   ```bash
   # Remove existing container
   docker stop dynamodb-local
   docker rm dynamodb-local

   # Start fresh and initialize
   npm run start-dynamodb
   # Answer 'y' when prompted to initialize tables
   ```

## Getting Help

- Check the [Architecture Documentation](../architecture/overview.md)
- Review the [Development Guidelines](coding-standards.md)
- Consult the [Testing Guide](testing.md)
- Review the [Performance Guidelines](performance.md) 