import requests
import json

ORY_API_KEY = "ory_pat_OWJYJOmklOXH42ywU8dzlnB07Epipu29"
ORY_API_URL = "https://romantic-murdock-ec5qj4t45r.projects.oryapis.com"

def main():
    identities = []
    r = requests.get(f"{ORY_API_URL}/admin/identities", headers = {"Authorization": f"Bearer {ORY_API_KEY}"})
    identities.extend(r.json())
    next_page = r.headers['link'].split(",")[-1].split(';')[0].strip("<>")
    while next_page:
        print(next_page)
        r = requests.get(f"{ORY_API_URL}{next_page}", headers = {"Authorization": f"Bearer {ORY_API_KEY}"})
        identities.extend(r.json())
        if len(r.headers['link'].split(",")) > 1:
            next_page = r.headers['link'].split(",")[-1].split(';')[0].strip("<>")
        else:
            next_page = None

    with open("dump/ory_identities.json", "w") as f:
        idents = {}
        for ident in identities:
            idents[ident['id']] = ident
        json.dump(idents, f, indent=4)

if __name__ == '__main__':
    main()
