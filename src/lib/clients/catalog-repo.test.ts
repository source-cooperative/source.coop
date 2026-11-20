/** @jest-environment node */
import { decodeJwt } from "jose";

jest.mock("@/lib/config", () => ({
  CONFIG: {
    catalog: {
      repo: "o/catalog",
      branch: "main",
      github: {
        appId: "11",
        installationId: "22",
        // As Vercel stores a multi-line PEM: newlines written as `\n`.
        privateKey: require("node:crypto")
          .generateKeyPairSync("rsa", { modulusLength: 2048 })
          .privateKey.export({ type: "pkcs1", format: "pem" })
          .toString()
          .replace(/\n/g, "\\n"),
      },
    },
  },
}));

import { readEntry, writeEntry } from "./catalog-repo";

const reply = (status: number, body: unknown = {}) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

describe("catalog repo", () => {
  it("signs in as the app, then reads, and reuses the token to write", async () => {
    fetchMock
      .mockReturnValueOnce(reply(201, { token: "tok", expires_at: "2099-01-01T00:00:00Z" }))
      .mockReturnValueOnce(
        reply(200, { sha: "s1", content: Buffer.from("héllo").toString("base64") })
      )
      .mockReturnValueOnce(reply(200))
      .mockReturnValueOnce(reply(409));

    expect(await readEntry("a/p.json")).toEqual({ sha: "s1", text: "héllo" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.github.com/app/installations/22/access_tokens");
    const claims = decodeJwt(init.headers.Authorization.replace("Bearer ", ""));
    expect(claims.iss).toBe("11");

    expect(await writeEntry("a/p.json", "x", "s1", "msg")).toBe(true);
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({ sha: "s1", branch: "main" });
    // A write against a stale sha is a conflict, not an error.
    expect(await writeEntry("a/p.json", "x", "old", "msg")).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
