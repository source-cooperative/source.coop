import { normalizeConnection } from "./data-connections";
import { DataConnection, DataProvider } from "@/types";

const base = {
  data_connection_id: "conn-a",
  name: "Conn",
  read_only: true,
  allowed_visibilities: [],
} as const;

describe("normalizeConnection (legacy provider read-shim)", () => {
  test('remaps legacy "gcp" to gcs', () => {
    const out = normalizeConnection({
      ...base,
      details: { provider: "gcp", bucket: "b", base_prefix: "" },
    } as unknown as DataConnection);
    expect(out.details.provider).toBe(DataProvider.GCS);
  });

  test('remaps legacy "az" to azure', () => {
    const out = normalizeConnection({
      ...base,
      details: { provider: "az", account_name: "a", container_name: "c", base_prefix: "" },
    } as unknown as DataConnection);
    expect(out.details.provider).toBe(DataProvider.Azure);
  });

  test("leaves canonical values untouched", () => {
    const conn = {
      ...base,
      details: { provider: DataProvider.S3, bucket: "b", base_prefix: "", region: "us-east-1" },
    } as DataConnection;
    expect(normalizeConnection(conn)).toBe(conn);
  });
});
