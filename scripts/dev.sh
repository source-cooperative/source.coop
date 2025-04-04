#!/bin/bash

# Function to check if a port is in use
check_port() {
    lsof -i :$1 >/dev/null 2>&1
    return $?
}

# Determine which port to use for Next.js
PORT=3000
if check_port 3000; then
    PORT=3001
    if check_port 3001; then
        PORT=3002
        if check_port 3002; then
            PORT=3003
        fi
    fi
fi

# Start Next.js in the background
echo "Starting Next.js..."
next dev &

# Wait for all background processes
wait
