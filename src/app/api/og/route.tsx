import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { LOGGER } from "@/lib";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get("title");
    const author = searchParams.get("author");

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "space-between",
            backgroundColor: "white",
            padding: "80px",
            fontFamily: "system-ui",
          }}
        >
          <div style={{ fontSize: "60px", fontWeight: "bold" }}>{title}</div>
          {author && <div style={{ fontSize: "30px" }}>by {author}</div>}
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    LOGGER.error("Failed to generate image", {
      operation: "og.GET",
      context: "image generation",
      error: e,
    });
    return new Response(`Failed to generate image: ${errorMessage}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
} 