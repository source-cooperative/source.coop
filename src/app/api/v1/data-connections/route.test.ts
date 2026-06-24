/** @jest-environment node */
import { NextRequest } from "next/server";
import { dataConnectionsTable } from "@/lib/clients/database";
import { getApiSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";

jest.mock("@/lib/clients/database", () => ({
  dataConnectionsTable: {
    listAll: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("@/lib/api/utils", () => ({
  getApiSession: jest.fn(),
}));

jest.mock("@/lib/api/authz", () => ({
  isAuthorized: jest.fn(),
}));


const { GET, POST } = require("./route");

describe("/api/v1/data-connections", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("GET returns filtered data connections", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({ identity_id: "user" });
    (dataConnectionsTable.listAll as jest.Mock).mockResolvedValue([
      { data_connection_id: "a", authentication: {} },
      { data_connection_id: "b", authentication: {} },
    ]);
    (isAuthorized as jest.Mock).mockReturnValue(true);

    const req = new NextRequest("http://localhost/api/v1/data-connections");
    const res = await GET(req);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.ok) {
      const json = await res.json();
      expect(json.length).toBe(2);
    }
  });

  test("POST strips secret-bearing auth from the create response", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({ identity_id: "user" });
    (isAuthorized as jest.Mock).mockReturnValue(true);

    const connection = {
      data_connection_id: "test-connection",
      name: "X",
      read_only: false,
      allowed_visibilities: ["public"],
      details: {
        provider: "s3",
        bucket: "b",
        base_prefix: "",
        region: "us-east-1",
      },
      authentication: {
        type: "s3_access_key",
        access_key_id: "AKIA",
        secret_access_key: "secret",
      },
    };
    (dataConnectionsTable.create as jest.Mock).mockResolvedValue(connection);

    const req = new NextRequest("http://localhost/api/v1/data-connections", {
      method: "POST",
      body: JSON.stringify(connection),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.authentication).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain("secret");
  });

  test("POST rejects an unowned id containing -- (namespace squat)", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({ identity_id: "admin" });
    (isAuthorized as jest.Mock).mockReturnValue(true);

    const connection = {
      data_connection_id: "acme--slug",
      name: "X",
      read_only: false,
      allowed_visibilities: ["public"],
      details: {
        provider: "s3",
        bucket: "b",
        base_prefix: "",
        region: "us-east-1",
      },
      authentication: {
        type: "s3_access_key",
        access_key_id: "AKIA",
        secret_access_key: "secret",
      },
    };

    const req = new NextRequest("http://localhost/api/v1/data-connections", {
      method: "POST",
      body: JSON.stringify(connection),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(dataConnectionsTable.create).not.toHaveBeenCalled();
  });
});
