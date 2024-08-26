import * as fs from "fs";
import * as path from "path";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

interface RelationTuple {
  // Define the structure of a relation tuple
  // Add properties as needed
}

interface Identity {
  id: string;
  // Add other properties as needed
}

interface RelationTuplesResponse {
  relation_tuples: RelationTuple[];
  next_page_token: string | null;
}

export async function dumpOryRelationships(output: string) {
  if (!fs.existsSync(path.join(output, "ory"))) {
    fs.mkdirSync(path.join(output, "ory"), { recursive: true });
  }

  const relationships: RelationTuple[] = [];
  let nextPage: string | null = null;

  do {
    const url = nextPage
      ? `${process.env.ORY_SDK_URL}/relation-tuples?page_token=${nextPage}`
      : `${process.env.ORY_SDK_URL}/relation-tuples`;

    const response: any = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.ORY_ACCESS_TOKEN}` },
    });
    const data: RelationTuplesResponse = await response.json();

    relationships.push(...data.relation_tuples);
    nextPage = data.next_page_token;
  } while (nextPage);

  fs.writeFileSync(
    path.join(output, "ory", "relationships.json"),
    JSON.stringify(relationships, null, 4)
  );
}

export async function dumpOryIdentities(output: string) {
  if (!fs.existsSync(path.join(output, "ory"))) {
    fs.mkdirSync(path.join(output, "ory"), { recursive: true });
  }

  const identities: Identity[] = [];
  let nextPageUrl: string | null = `/admin/identities`;

  while (nextPageUrl) {
    const response: any = await fetch(
      `${process.env.ORY_SDK_URL}${nextPageUrl}`,
      {
        headers: { Authorization: `Bearer ${process.env.ORY_ACCESS_TOKEN}` },
      }
    );
    const data: Identity[] = await response.json();

    identities.push(...data);

    const linkHeader = response.headers.get("link");
    if (linkHeader) {
      const links = linkHeader.split(",");
      const nextLink = links.find((link: any) => link.includes('rel="next"'));
      nextPageUrl = nextLink
        ? nextLink.split(";")[0].trim().slice(1, -1)
        : null;
    } else {
      nextPageUrl = null;
    }
  }

  const identitiesMap: { [key: string]: Identity } = {};
  identities.forEach((identity) => {
    identitiesMap[identity.id] = identity;
  });

  fs.writeFileSync(
    path.join(output, "ory", "identities.json"),
    JSON.stringify(identitiesMap, null, 4)
  );
}

export async function dumpTable(tableName: string, output: string) {
  if (!fs.existsSync(path.join(output, "table"))) {
    fs.mkdirSync(path.join(output, "table"), { recursive: true });
  }

  const client = new DynamoDBClient({});

  let items: any[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  try {
    // Scan the table, handling pagination
    do {
      const command = new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const response = await client.send(command);

      if (response.Items) {
        // Unmarshall and add items to our array
        items = items.concat(response.Items.map((item) => unmarshall(item)));
      }

      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Write items to JSON file
    fs.writeFileSync(
      path.join(output, "table", `${tableName}.json`),
      JSON.stringify(items, null, 4)
    );

    console.log(
      `Scan complete. ${items.length} items written to ${output}/tables/${tableName}.json`
    );
  } catch (error) {
    console.error("Error scanning table or writing file:", error);
    throw error;
  }
}
