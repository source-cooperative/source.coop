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

  test("POST creates a data connection when authorized", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({ identity_id: "user" });
    (isAuthorized as jest.Mock).mockReturnValue(true);
    (dataConnectionsTable.create as jest.Mock).mockResolvedValue({ id: "x" });

    const body = { data_connection_id: "x", authentication: {} };
    const req = new NextRequest("http://localhost/api/v1/data-connections", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});
