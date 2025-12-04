import { ImageResponse } from "next/og";

export const ogImageSize = {
  width: 1200,
  height: 630,
};

export const ogImageContentType = "image/png";

interface OpenGraphImageProps {
  title: string;
  subtitle?: string;
  footer?: string;
}

export function OpenGraphImage({
  title,
  subtitle,
  footer = "Source Cooperative",
}: OpenGraphImageProps) {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: "linear-gradient(to bottom right, #1e3a8a, #3b82f6)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          padding: "40px",
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: "bold",
            marginBottom: subtitle ? 20 : 0,
            textAlign: "center",
            maxWidth: "90%",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 40,
              opacity: 0.8,
              textAlign: "center",
              maxWidth: "90%",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subtitle}
          </div>
        )}
        {footer && (
          <div
            style={{
              fontSize: 28,
              opacity: 0.6,
              marginTop: 30,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    ),
    {
      ...ogImageSize,
    }
  );
}
