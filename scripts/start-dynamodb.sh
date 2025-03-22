#!/bin/bash

# Parse arguments
NO_INIT=false
for arg in "$@"; do
  if [ "$arg" == "--no-init" ]; then
    NO_INIT=true
  fi
done

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Starting Docker..."
  # Try to start Docker (for macOS users with Colima)
  if command -v colima > /dev/null; then
    colima start
  else
    echo "Docker is not running. Please start Docker and try again."
    exit 1
  fi
fi

# Check if DynamoDB container is already running
if docker ps | grep -q "dynamodb-local"; then
  echo "DynamoDB is already running on port 8000"
else
  echo "Starting DynamoDB on port 8000..."
  docker run -d --name dynamodb-local -p 8000:8000 amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb
  echo "DynamoDB started on port 8000"
fi

# Check if tables exist
TABLE_COUNT=$(aws dynamodb list-tables --endpoint-url http://localhost:8000 2>/dev/null | grep -o "Accounts\|Repositories" | wc -l | tr -d ' ')

# Run initialization script if tables need to be created
if [ "$NO_INIT" = false ]; then
  if [ "$TABLE_COUNT" -lt 2 ]; then
    echo "No tables found. Tables need to be initialized."
    echo "Would you like to initialize the database tables? (y/n)"
    read answer
    if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
      echo "Initializing database tables..."
      npx ts-node scripts/init-local.ts
    fi
  else
    echo "Tables already exist. Skipping initialization."
  fi
else
  echo "Skipping table initialization (--no-init flag provided)"
fi

echo "DynamoDB setup complete" 