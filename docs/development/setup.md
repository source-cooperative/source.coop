# Development Setup

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

## Quick Start

```bash
# Clone and setup
git clone https://github.com/your-org/source.coop.git
cd source.coop
cp .env.example .env.local
npm install

# Start services and dev server
docker-compose up -d
npm run dev
```

## Essential Commands

```bash
npm run dev         # Start development server
docker-compose up -d # Start DynamoDB
npm run init-local  # Initialize database
docker-compose down # Stop services
```

## Environment Variables

Copy `.env.example` to `.env.local` with required variables:

- Ory Config
  - `NEXT_PUBLIC_ORY_SDK_URL` - Ory authentication backend URL
  - `ORY_PROJECT_API_KEY` - Ory project API key
- Storage Config
  - `NEXT_PUBLIC_S3_ENDPOINT` - URL of S3 data server (e.g. `https://data.source.proxy`)
- DB Config
  - `DYNAMODB_ENDPOINT` - URL of DynamoDB endpoint (e.g. `http://localhost:8000`)
  - `STAGE` - DB stage (e.g. `local`)
