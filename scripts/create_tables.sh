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

  # shellcheck disable=SC2181
  if [[ ${?} -ne 0 ]]; then
    return 1
  fi

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


  # shellcheck disable=SC2086
  response=$(aws dynamodb --endpoint-url http://localhost:8000 create-table \
      --table-name source-cooperative-organization-members \
      --attribute-definitions \
          AttributeName=user_id,AttributeType=S \
          AttributeName=organization_id,AttributeType=S \
      --key-schema \
          AttributeName=user_id,KeyType=HASH \
      --provisioned-throughput \
          ReadCapacityUnits=1,WriteCapacityUnits=1 \
      --global-secondary-indexes \
        "[
            {
                \"IndexName\": \"organization_id\",
                \"KeySchema\": [{\"AttributeName\":\"organization_id\",\"KeyType\":\"HASH\"}],
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
}

create_tables
