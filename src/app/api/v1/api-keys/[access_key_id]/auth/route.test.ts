/** @jest-environment node */
import { GET } from "./route";

describe("GET /api/v1/api-keys/[access_key_id]/auth", () => {
  test("answers 410, whoever asks, with no secret", async () => {
    const res = GET();
    expect(res.status).toBe(410);
    await expect(res.json()).resolves.toEqual({
      error: expect.stringContaining("service account"),
    });
  });
});
