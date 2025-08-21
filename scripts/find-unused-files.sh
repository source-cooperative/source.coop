#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Scanning for potentially unused files...${NC}"
echo

# Get all TypeScript files
files=$(find src -type f -name "*.tsx" -o -name "*.ts" | grep -v "test.tsx" | grep -v "test.ts" | grep -v ".d.ts")

potentially_unused=()

for file in $files; do
  # Skip index files
  if [[ $(basename "$file") == "index.ts" || $(basename "$file") == "index.tsx" ]]; then
    continue
  fi
  
  # Skip directly used Next.js page files
  if [[ "$file" == *"/app/"*"/page.tsx" || "$file" == *"/pages/"*".tsx" ]]; then
    continue
  fi

  # Skip configuration and setup files
  if [[ "$file" == *"config"* || "$file" == *"setup"* || "$file" == *"types"* ]]; then
    continue
  fi
  
  # Get the file name without extension
  filename=$(basename "$file" | sed 's/\.[^.]*$//')
  
  # Check if the file exports anything
  has_export=$(grep -E "export (default|function|const|class|interface|type)" "$file")
  
  if [[ -n "$has_export" ]]; then
    # Check if this file is imported anywhere else
    # Note: This is imperfect as it might miss dynamic imports or renamed imports
    
    # Get all possible import patterns for this file
    imports_count=$(grep -r --include="*.tsx" --include="*.ts" -l "import.*${filename}" src | grep -v "$file" | wc -l)
    named_imports_count=$(grep -r --include="*.tsx" --include="*.ts" -l "from ['\"].*${filename}" src | grep -v "$file" | wc -l)
    
    # If no imports found, it might be unused
    if [[ $imports_count -eq 0 && $named_imports_count -eq 0 ]]; then
      potentially_unused+=("$file")
    fi
  fi
done

# Print results
echo -e "${YELLOW}Found ${#potentially_unused[@]} potentially unused files:${NC}"
echo

for file in "${potentially_unused[@]}"; do
  echo -e "${RED}$file${NC}"
  # Print the exports to help identify what's in this file
  echo -e "${YELLOW}Exports:${NC}"
  grep -E "export (default|function|const|class|interface|type)" "$file" | head -3
  echo
done

echo -e "${YELLOW}Note: This is an approximation. Some files might be used through dynamic imports or other means.${NC}"
echo -e "${YELLOW}Manual verification is recommended before deletion.${NC}" 