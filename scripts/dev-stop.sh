#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
CHECK="✓"
ARROW="→"
CROSS="✗"

echo "${YELLOW}=== Stopping Source Cooperative Development Environment ===${NC}"

# Stop Docker services
echo -e "\n${YELLOW}${ARROW} Stopping Docker services...${NC}"
if docker-compose down > /dev/null 2>&1; then
    echo -e "${GREEN}${CHECK} Docker services stopped${NC}"
else
    echo -e "${RED}${CROSS} Failed to stop Docker services${NC}"
fi

# Optionally stop Colima (uncomment if you want to stop it completely)
# echo -e "\n${YELLOW}${ARROW} Stopping Colima...${NC}"
# if colima stop > /dev/null 2>&1; then
#     echo -e "${GREEN}${CHECK} Colima stopped${NC}"
# else
#     echo -e "${RED}${CROSS} Failed to stop Colima${NC}"
# fi

echo -e "\n${GREEN}${CHECK} Development environment stopped${NC}"
echo -e "${YELLOW}${ARROW} Note: Colima is still running for future use${NC}"
echo -e "${YELLOW}${ARROW} Run 'colima stop' if you want to stop it completely${NC}"
