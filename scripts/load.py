import boto3
import json

dynamodb = boto3.resource('dynamodb', endpoint_url='http://localhost:8000')

def main():
    with open('dump/api_keys.json', "r") as f:
        api_keys = json.load(f)

    table = dynamodb.Table('source-cooperative-api-keys')

    for api_key in api_keys:
        res = table.put_item(Item=api_key)

    with open('dump/repositories.json', "r") as f:
        repositories = json.load(f)

    table = dynamodb.Table('source-cooperative-repositories')

    for repository in repositories:
        res = table.put_item(Item=repository)


    with open('dump/accounts.json', "r") as f:
        accounts = json.load(f)

    table = dynamodb.Table('source-cooperative-accounts')

    for account in accounts:
        res = table.put_item(Item=account)

if __name__ == "__main__":
    main()
