import { NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import type { ExtendedSession } from "@/types/session";

export async function GET() {
  const session = (await getApiSession(request)) as ExtendedSession | null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(session);
}
