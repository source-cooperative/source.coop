#!/bin/bash

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Start Next.js in the background
echo "Starting Next.js..."
next dev &

# Wait a moment for Next.js to start
sleep 2

# Check if the tunnel is already running
if ! check_port 4000; then
    echo "Starting Ory tunnel..."
    ory tunnel http://localhost:3000 --project ff8f07bb-adb7-4399-af07-20e633a105f6
else
    echo "Ory tunnel is already running on port 4000"
fi

# Wait for all background processes
wait 