#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
CHECK="✓"
ARROW="→"

echo "${YELLOW}=== Clean Start for Source.coop Development ===${NC}"

# Step 1: Clean up
echo -e "\n${YELLOW}${ARROW} Cleaning up...${NC}"
pkill -f "next dev" > /dev/null 2>&1
docker-compose down > /dev/null 2>&1
rm -rf .next
echo -e "${GREEN}${CHECK} Cleaned up old processes and build cache${NC}"

# Step 2: Start Docker services
echo -e "\n${YELLOW}${ARROW} Starting Docker services (DynamoDB on :8000)...${NC}"
docker-compose up -d
echo -e "${GREEN}${CHECK} Docker services started${NC}"

# Step 3: Wait for services
echo -e "\n${YELLOW}${ARROW} Waiting for services to initialize...${NC}"
sleep 10
echo -e "${GREEN}${CHECK} Services ready${NC}"

# Step 4: Start dev server without AWS profile
echo -e "\n${YELLOW}${ARROW} Starting development server...${NC}"
echo -e "${GREEN}Application will be available at: http://localhost:3000${NC}"
echo -e "${GREEN}DynamoDB Admin UI at: http://localhost:8001${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop the development server${NC}\n"

# Unset AWS profile to use local DynamoDB
unset AWS_PROFILE
unset AWS_DEFAULT_PROFILE
npm run dev

