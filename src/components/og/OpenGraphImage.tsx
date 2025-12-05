import { ImageResponse } from "next/og";
import Logo from "public/logo/logotype-dark.svg";

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
          height: "100%",
          width: "100%",
          display: "flex",
          textAlign: "center",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          flexWrap: "nowrap",
          backgroundColor: "white",
          backgroundSize: "100px 100px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Logo />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 40,
            fontStyle: "normal",
            color: "black",
            marginTop: 30,
            lineHeight: 1.8,
            whiteSpace: "pre-wrap",
          }}
        >
          <b>{title}</b>
        </div>
        {subtitle && (
          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontStyle: "normal",
              color: "black",
              marginTop: 30,
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    ),
    {
      ...ogImageSize,
    }
  );
}
