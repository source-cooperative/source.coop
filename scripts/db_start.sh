#!/bin/bash


# Set the container name or ID
CONTAINER_NAME="dynamodb"

###############################################################################
# function iecho
#
# This function enables the script to display the specified text only if
# the global variable $VERBOSE is set to true.
###############################################################################
function iecho() {
  if [[ $VERBOSE == true ]]; then
    echo "$@"
  fi
}

###############################################################################
# function errecho
#
# This function outputs everything sent to it to STDERR (standard error output).
###############################################################################
function errecho() {
  printf "%s\n" "$*" 1>&2
}


function start_db() {
    echo "Checking if the dynamodb container is already running..."

    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "Container '$CONTAINER_NAME' is already running."
        return 1
    fi

    echo "Container '$CONTAINER_NAME' is not running. Starting DynamoDB Local..."

    docker run -d --name=$CONTAINER_NAME -p 8000:8000 amazon/dynamodb-local

    # DynamoDB Local endpoint
    DYNAMODB_ENDPOINT="http://localhost:8000"

    # Function to check if DynamoDB Local is ready
    check_dynamodb_ready() {
    aws dynamodb list-tables --endpoint-url $DYNAMODB_ENDPOINT --region us-west-2 > /dev/null 2>&1
    return $?
    }

    echo "Waiting for DynamoDB Local to be ready..."

    # Wait for the container to be in a running state
    while [ "$(docker inspect -f {{.State.Running}} $CONTAINER_NAME 2>/dev/null)" != "true" ]; do
        sleep 1
    done

    # Wait for DynamoDB to be responsive
    COUNTER=0
    TIMEOUT=30
    until check_dynamodb_ready || [ $COUNTER -eq $TIMEOUT ]; do
        echo "DynamoDB Local is not ready yet. Waiting..."
        sleep 1
        ((COUNTER++))
    done

    if [ $COUNTER -eq $TIMEOUT ]; then
        echo "Timeout: DynamoDB Local did not become ready in time."
        exit 1
    else
        echo "DynamoDB Local is ready!"
    fi
}


start_db

echo "DynamoDB Local is running at http://localhost:8000"

echo "Initializing tables..."

sc init
