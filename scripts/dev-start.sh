#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
CHECK="✓"
ARROW="→"
CROSS="✗"

echo "${YELLOW}=== Starting Source Cooperative Development Environment ===${NC}"

# Step 1: Check if Colima is running
echo -e "\n${YELLOW}${ARROW} Checking Colima status...${NC}"
if ! colima status > /dev/null 2>&1; then
    echo -e "${YELLOW}${ARROW} Starting Colima...${NC}"
    colima start
    echo -e "${GREEN}${CHECK} Colima started${NC}"
else
    echo -e "${GREEN}${CHECK} Colima is already running${NC}"
fi

# Step 2: Start Docker services
echo -e "\n${YELLOW}${ARROW} Starting Docker services...${NC}"
if docker-compose up -d > /dev/null 2>&1; then
    echo -e "${GREEN}${CHECK} Docker services started${NC}"
else
    echo -e "${RED}${CROSS} Failed to start Docker services${NC}"
    exit 1
fi

# Step 3: Wait for services to be ready
echo -e "\n${YELLOW}${ARROW} Waiting for services to be ready...${NC}"
sleep 3

# Step 4: Verify database is accessible
echo -e "\n${YELLOW}${ARROW} Verifying database connection...${NC}"
if aws dynamodb scan --endpoint-url http://localhost:8000 --table-name sc-accounts --select COUNT > /dev/null 2>&1; then
    echo -e "${GREEN}${CHECK} Database is accessible${NC}"
else
    echo -e "${RED}${CROSS} Database is not accessible${NC}"
    echo -e "${YELLOW}${ARROW} Waiting a bit longer for services to start...${NC}"
    sleep 5
fi

# Step 5: Start development server
echo -e "\n${YELLOW}${ARROW} Starting development server...${NC}"
echo -e "${GREEN}${CHECK} All services ready! Starting npm run dev...${NC}"
echo -e "\n${GREEN}=== Development environment ready! ===${NC}"
echo -e "${YELLOW}${ARROW} Application will be available at: http://localhost:3000${NC}"
echo -e "${YELLOW}${ARROW} Database is running at: http://localhost:8000${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop the development server${NC}"

npm run dev
