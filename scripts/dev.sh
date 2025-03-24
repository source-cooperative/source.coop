#!/bin/bash

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Kill any existing ory tunnel
pkill -f "ory tunnel" || true

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

# Wait a moment for Next.js to start
sleep 3

# Determine which port Next.js is actually using by checking logs or ports
NEXT_PORT=$PORT
if check_port 3000; then
    NEXT_PORT=3000
elif check_port 3001; then
    NEXT_PORT=3001
elif check_port 3002; then
    NEXT_PORT=3002
elif check_port 3003; then
    NEXT_PORT=3003
fi

# Check if the tunnel is already running
if ! check_port 4000; then
    echo "Starting Ory tunnel on port 4000, targeting Next.js on port $NEXT_PORT..."
    ory tunnel --dev --allowed-cors-origins="http://localhost:$NEXT_PORT" --debug --project ff8f07bb-adb7-4399-af07-20e633a105f6 http://localhost:$NEXT_PORT &
else
    echo "Ory tunnel is already running on port 4000"
fi

# Wait for all background processes
wait 