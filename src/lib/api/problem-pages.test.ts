/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET as index } from "@/app/api/problems/route";
import { GET as page } from "@/app/api/problems/[code]/route";
import { PROBLEMS, ProblemCode, problemType } from "./problems";

const get = (code: string) =>
  page(new NextRequest(`http://localhost/api/problems/${code}`), {
    params: Promise.resolve({ code }),
  });

describe("/api/problems", () => {
  test.each(Object.keys(PROBLEMS) as ProblemCode[])(
    "explains %s at its type URL",
    async (code) => {
      expect(problemType(code)).toBe(`/api/problems/${code}`);
      const res = await get(code);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      const html = await res.text();
      expect(html).toContain(PROBLEMS[code].title);
      expect(html).toContain(`http://localhost/api/problems/${code}`);
    }
  );

  test("answers an unknown type with a problem", async () => {
    const res = await get("teapot");
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ code: "not_found" });
  });

  test("lists every type", async () => {
    const html = await index().text();
    for (const code of Object.keys(PROBLEMS)) {
      expect(html).toContain(`href="/api/problems/${code}"`);
    }
  });
});
