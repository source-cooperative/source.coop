mkdir -p dump/

aws dynamodb scan --table-name source-cooperative-accounts > dump/dynamodb_accounts.json
aws dynamodb scan --table-name source-cooperative-repositories > dump/dynamodb_repositories.json
aws dynamodb scan --table-name source-cooperative-api-keys > dump/dynamodb_api_keys.json

python dump_ory.py
