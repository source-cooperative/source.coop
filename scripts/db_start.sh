#!/bin/bash


# Set the container name or ID
DYNAMODB_CONTAINER_NAME="source-dynamodb"
S3_CONTAINER_NAME="source-s3"

# Get the directory of the current script
SCRIPT_DIR=$(dirname "$0")

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

function start_s3() {
    echo "Checking if the S3 container is already running..."

    if docker ps --format '{{.Names}}' | grep -q "^${S3_CONTAINER_NAME}$"; then
        echo "Container '$S3_CONTAINER_NAME' is already running."
        return 1
    fi

    echo "Container '$S3_CONTAINER_NAME' is not running. Starting S3 Local..."

    docker run -d --name=$S3_CONTAINER_NAME -p 5050:5000 motoserver/moto

    # S3 endpoint
    S3_ENDPOINT="http://localhost:5050"

    # Function to check if S3 is ready
    check_s3_ready() {
    aws s3 ls --endpoint-url $S3_ENDPOINT > /dev/null 2>&1
    return $?
    }

    echo "Waiting for S3 to be ready..."

    # Wait for the container to be in a running state
    while [ "$(docker inspect -f {{.State.Running}} $S3_CONTAINER_NAME 2>/dev/null)" != "true" ]; do
        sleep 1
    done

    # Wait for S3 to be responsive
    COUNTER=0
    TIMEOUT=30
    until check_s3_ready || [ $COUNTER -eq $TIMEOUT ]; do
        echo "S3 is not ready yet. Waiting..."
        sleep 1
        ((COUNTER++))
    done

    if [ $COUNTER -eq $TIMEOUT ]; then
        echo "Timeout: S3 did not become ready in time."
        exit 1
    else
        aws s3 mb s3://source-cooperative --endpoint-url $S3_ENDPOINT
        aws s3api put-bucket-policy --bucket source-cooperative --policy file://"${SCRIPT_DIR}/bucket_policy.json" --endpoint-url $S3_ENDPOINT
        echo "S3 is ready!"
    fi
}


function start_db() {
    echo "Checking if the DynamoDB container is already running..."

    if docker ps --format '{{.Names}}' | grep -q "^${DYNAMODB_CONTAINER_NAME}$"; then
        echo "Container '$DYNAMODB_CONTAINER_NAME' is already running."
        return 1
    fi

    echo "Container '$DYNAMODB_CONTAINER_NAME' is not running. Starting DynamoDB Local..."

    docker run -d --name=$DYNAMODB_CONTAINER_NAME -p 8000:8000 amazon/dynamodb-local

    # DynamoDB endpoint
    DYNAMODB_ENDPOINT="http://localhost:8000"

    # Function to check if DynamoDB is ready
    check_dynamodb_ready() {
    aws dynamodb list-tables --endpoint-url $DYNAMODB_ENDPOINT --region us-west-2 > /dev/null 2>&1
    return $?
    }

    echo "Waiting for DynamoDB to be ready..."

    # Wait for the container to be in a running state
    while [ "$(docker inspect -f {{.State.Running}} $DYNAMODB_CONTAINER_NAME 2>/dev/null)" != "true" ]; do
        sleep 1
    done

    # Wait for DynamoDB to be responsive
    COUNTER=0
    TIMEOUT=30
    until check_dynamodb_ready || [ $COUNTER -eq $TIMEOUT ]; do
        echo "DynamoDB is not ready yet. Waiting..."
        sleep 1
        ((COUNTER++))
    done

    if [ $COUNTER -eq $TIMEOUT ]; then
        echo "Timeout: DynamoDB did not become ready in time."
        exit 1
    else
        echo "DynamoDB is ready!"
    fi
}


start_s3
echo "S3 is running at http://localhost:5050"

start_db
echo "DynamoDB is running at http://localhost:8000"

echo "Initializing tables..."
sc init
