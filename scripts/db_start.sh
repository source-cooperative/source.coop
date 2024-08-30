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

function create_tables() {
    echo "Creating tables in the local dynamodb instance..."

    echo "Creating table source-cooperative-accounts..."
    # shellcheck disable=SC2086
    response=$(aws dynamodb --endpoint-url http://localhost:8000 create-table \
        --table-name source-cooperative-accounts \
        --attribute-definitions \
            AttributeName=account_id,AttributeType=S \
            AttributeName=identity_id,AttributeType=S \
            AttributeName=account_type,AttributeType=S \
        --key-schema \
            AttributeName=account_id,KeyType=HASH \
        --provisioned-throughput \
            ReadCapacityUnits=1,WriteCapacityUnits=1 \
        --global-secondary-indexes \
            "[
                {
                    \"IndexName\": \"identity_id\",
                    \"KeySchema\": [{\"AttributeName\":\"identity_id\",\"KeyType\":\"HASH\"}],
                    \"Projection\":{
                        \"ProjectionType\":\"ALL\"
                    },
                    \"ProvisionedThroughput\": {
                        \"ReadCapacityUnits\": 1,
                        \"WriteCapacityUnits\": 1
                    }
                },
                {
                    \"IndexName\": \"account_type\",
                    \"KeySchema\": [{\"AttributeName\":\"account_type\",\"KeyType\":\"HASH\"}],
                    \"Projection\":{
                        \"ProjectionType\":\"ALL\"
                    },
                    \"ProvisionedThroughput\": {
                        \"ReadCapacityUnits\": 1,
                        \"WriteCapacityUnits\": 1
                    }
                }
            ]"
    )
    echo $response

    # shellcheck disable=SC2181
    if [[ ${?} -ne 0 ]]; then
        return 1
    fi

    echo "Creating table source-cooperative-repositories..."
    # shellcheck disable=SC2086
    response=$(aws dynamodb --endpoint-url http://localhost:8000 create-table \
        --table-name source-cooperative-repositories \
        --attribute-definitions \
            AttributeName=account_id,AttributeType=S \
            AttributeName=repository_id,AttributeType=S \
            AttributeName=featured,AttributeType=N \
        --key-schema \
            AttributeName=account_id,KeyType=HASH \
            AttributeName=repository_id,KeyType=RANGE \
        --provisioned-throughput \
            ReadCapacityUnits=1,WriteCapacityUnits=1 \
        --global-secondary-indexes \
            "[
                {
                    \"IndexName\": \"featured\",
                    \"KeySchema\": [{\"AttributeName\":\"featured\",\"KeyType\":\"HASH\"}],
                    \"Projection\":{
                        \"ProjectionType\":\"ALL\"
                    },
                    \"ProvisionedThroughput\": {
                        \"ReadCapacityUnits\": 1,
                        \"WriteCapacityUnits\": 1
                    }
                }
            ]"
    )

    # shellcheck disable=SC2181
    if [[ ${?} -ne 0 ]]; then
        return 1
    fi

    echo "Creating table source-cooperative-api-keys..."
    # shellcheck disable=SC2086
    response=$(aws dynamodb --endpoint-url http://localhost:8000 create-table \
        --table-name source-cooperative-api-keys \
        --attribute-definitions \
            AttributeName=access_key_id,AttributeType=S \
            AttributeName=account_id,AttributeType=S \
        --key-schema \
            AttributeName=access_key_id,KeyType=HASH \
        --provisioned-throughput \
            ReadCapacityUnits=1,WriteCapacityUnits=1 \
        --global-secondary-indexes \
            "[
                {
                    \"IndexName\": \"account_id\",
                    \"KeySchema\": [{\"AttributeName\":\"account_id\",\"KeyType\":\"HASH\"}],
                    \"Projection\":{
                        \"ProjectionType\":\"ALL\"
                    },
                    \"ProvisionedThroughput\": {
                        \"ReadCapacityUnits\": 1,
                        \"WriteCapacityUnits\": 1
                    }
                }
            ]"
    )

    # shellcheck disable=SC2181
    if [[ ${?} -ne 0 ]]; then
        return 1
    fi

    echo "Creating table source-cooperative-memberships..."
    # shellcheck disable=SC2086
    response=$(aws dynamodb --endpoint-url http://localhost:8000 create-table \
        --table-name source-cooperative-memberships \
        --attribute-definitions \
            AttributeName=membership_id,AttributeType=S \
            AttributeName=account_id,AttributeType=S \
            AttributeName=membership_account_id,AttributeType=S \
            AttributeName=repository_id,AttributeType=S \
        --key-schema \
            AttributeName=membership_id,KeyType=HASH \
        --provisioned-throughput \
            ReadCapacityUnits=1,WriteCapacityUnits=1 \
        --global-secondary-indexes \
            "[
                {
                    \"IndexName\": \"membership_account_id\",
                    \"KeySchema\": [{\"AttributeName\":\"membership_account_id\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"repository_id\",\"KeyType\":\"RANGE\"}],
                    \"Projection\":{
                        \"ProjectionType\":\"ALL\"
                    },
                    \"ProvisionedThroughput\": {
                        \"ReadCapacityUnits\": 1,
                        \"WriteCapacityUnits\": 1
                    }
                },
                {
                    \"IndexName\": \"account_id\",
                    \"KeySchema\": [{\"AttributeName\":\"account_id\",\"KeyType\":\"HASH\"}],
                    \"Projection\":{
                        \"ProjectionType\":\"ALL\"
                    },
                    \"ProvisionedThroughput\": {
                        \"ReadCapacityUnits\": 1,
                        \"WriteCapacityUnits\": 1
                    }
                }
            ]"
    )

    # shellcheck disable=SC2181
    if [[ ${?} -ne 0 ]]; then
        return 1
    fi

    echo "Creating table source-cooperative-data-connections..."
    # shellcheck disable=SC2086
    response=$(aws dynamodb --endpoint-url http://localhost:8000 create-table \
        --table-name source-cooperative-data-connections \
        --attribute-definitions \
            AttributeName=data_connection_id,AttributeType=S \
        --key-schema \
            AttributeName=data_connection_id,KeyType=HASH \
        --provisioned-throughput \
            ReadCapacityUnits=1,WriteCapacityUnits=1 \
    )

    # shellcheck disable=SC2181
    if [[ ${?} -ne 0 ]]; then
        return 1
    fi
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

    create_tables
}


start_db

echo "DynamoDB Local is running at http://localhost:8000"
