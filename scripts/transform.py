import json
from dynamodb_json import json_util as dbjson
import pprint

def main():
    identities = json.load(open("dump/ory_identities.json"))
    accounts = json.load(open("dump/dynamodb_accounts.json"))
    repositories = json.load(open("dump/dynamodb_repositories.json"))
    api_keys = json.load(open("dump/dynamodb_api_keys.json"))

    accounts = [dbjson.loads(json.dumps(account)) for account in accounts["Items"]]
    repositories = [dbjson.loads(json.dumps(repository)) for repository in repositories["Items"]]
    api_keys = [dbjson.loads(json.dumps(api_key)) for api_key in api_keys["Items"]]

    new_accounts = []
    for account in accounts:
        if account["account_type"] == "user":
            matching_identity = identities.get(account["identity_id"])
            if not matching_identity:
                continue

            flags = []

            if matching_identity.get("metadata_public"):
                flags = matching_identity["metadata_public"].get("flags", [])

            new_account = {
                "account_id": account["account_id"],
                "account_type": "user",
                "identity": matching_identity["id"],
                "email": matching_identity["traits"]["email"],
                "disabled": account["disabled"],
                "flags": flags,
                "profile": {
                    "name": f"{matching_identity['traits']['name']['first_name']} {matching_identity['traits']['name']['last_name']}",
                    "bio": matching_identity["traits"].get("bio", None),
                    "location": matching_identity["traits"].get("country", None),
                }
            }

            new_accounts.append(new_account)
        else:
            new_account = {
                "account_id": account["account_id"],
                "account_type": "organization",
                "disabled": account["disabled"],
                "flags": [],
                "profile": {
                    "name": account["name"],
                    "bio": account["description"]
                }
            }

            new_accounts.append(new_account)

    with open("dump/accounts.json", "w") as f:
        json.dump(new_accounts, f, indent=4)

    with open("dump/repositories.json", "w") as f:
        json.dump(repositories, f, indent=4)

    with open("dump/api_keys.json", "w") as f:
        json.dump(api_keys, f, indent=4)


if __name__ == "__main__":
    main()
