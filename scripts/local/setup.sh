#!/bin/bash

# Colors and formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
CHECK="✓"
ARROW="→"
CROSS="✗"

echo "${YELLOW}=== Setting up local DynamoDB ===${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}${CROSS} Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Start DynamoDB Local if not running
if ! docker ps | grep -q "dynamodb-local"; then
    echo -e "${YELLOW}${ARROW} Starting DynamoDB Local...${NC}"
    docker run -d -p 8000:8000 amazon/dynamodb-local
    echo -e "${YELLOW}${ARROW} Waiting for DynamoDB Local to start...${NC}"
    sleep 2
    echo -e "${GREEN}${CHECK} DynamoDB Local started${NC}"
else
    echo -e "${GREEN}${CHECK} DynamoDB Local is already running${NC}"
fi

# Create tables
echo -e "\n${YELLOW}=== Creating Tables ===${NC}"

echo -e "\n${YELLOW}${ARROW} Creating Accounts table...${NC}"
if aws dynamodb create-table \
    --endpoint-url http://localhost:8000 \
    --table-name Accounts \
    --attribute-definitions \
        AttributeName=account_id,AttributeType=S \
        AttributeName=type,AttributeType=S \
        AttributeName=email,AttributeType=S \
    --key-schema \
        AttributeName=account_id,KeyType=HASH \
        AttributeName=type,KeyType=RANGE \
    --global-secondary-indexes \
        "[{\"IndexName\": \"GSI1\",\"KeySchema\":[{\"AttributeName\":\"type\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"account_id\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}},{\"IndexName\": \"GSI2\",\"KeySchema\":[{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"account_id\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}]" \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    > /dev/null 2>&1; then
    echo -e "${GREEN}${CHECK} Created Accounts table${NC}"
else
    echo -e "${YELLOW}${ARROW} Accounts table already exists${NC}"
fi

echo -e "\n${YELLOW}${ARROW} Creating Repositories table...${NC}"
if aws dynamodb create-table \
    --endpoint-url http://localhost:8000 \
    --table-name Repositories \
    --attribute-definitions \
        AttributeName=repository_id,AttributeType=S \
        AttributeName=account_id,AttributeType=S \
        AttributeName=created_at,AttributeType=S \
    --key-schema \
        AttributeName=repository_id,KeyType=HASH \
        AttributeName=account_id,KeyType=RANGE \
    --global-secondary-indexes \
        "[{\"IndexName\": \"GSI1\",\"KeySchema\":[{\"AttributeName\":\"account_id\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"created_at\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}]" \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    > /dev/null 2>&1; then
    echo -e "${GREEN}${CHECK} Created Repositories table${NC}"
else
    echo -e "${YELLOW}${ARROW} Repositories table already exists${NC}"
fi

# Wait for tables to be active
echo -e "\n${YELLOW}${ARROW} Waiting for tables to be active...${NC}"
sleep 5

# Verify table status
echo -e "\n${YELLOW}${ARROW} Verifying table status...${NC}"
ACCOUNTS_STATUS=$(aws dynamodb describe-table --endpoint-url http://localhost:8000 --table-name Accounts --query 'Table.TableStatus' --output text)
REPOS_STATUS=$(aws dynamodb describe-table --endpoint-url http://localhost:8000 --table-name Repositories --query 'Table.TableStatus' --output text)

if [ "$ACCOUNTS_STATUS" != "ACTIVE" ] || [ "$REPOS_STATUS" != "ACTIVE" ]; then
  echo -e "${RED}${CROSS} Tables are not active yet. Please try again.${NC}"
  exit 1
fi

echo -e "${GREEN}${CHECK} Tables are active${NC}"

# Load test data
echo -e "\n${YELLOW}=== Loading Test Data ===${NC}"
echo -e "${YELLOW}${ARROW} Loading test data from test-storage...${NC}"
npm run setup-test-data

# Verify data
echo -e "\n${YELLOW}=== Verifying Data ===${NC}"

# Get counts directly
ACCOUNT_COUNT=$(aws dynamodb scan \
    --endpoint-url http://localhost:8000 \
    --table-name Accounts \
    --select COUNT \
    --output text)
echo -e "\n${YELLOW}${ARROW} Accounts loaded: ${GREEN}${CHECK} ${ACCOUNT_COUNT} accounts found${NC}"

REPO_COUNT=$(aws dynamodb scan \
    --endpoint-url http://localhost:8000 \
    --table-name Repositories \
    --select COUNT \
    --output text)
echo -e "${YELLOW}${ARROW} Repositories loaded: ${GREEN}${CHECK} ${REPO_COUNT} repositories found${NC}"

echo -e "\n${GREEN}${CHECK} Setup complete!${NC}\n"
echo "Loaded $ACCOUNT_COUNT accounts and $REPO_COUNT repositories" 