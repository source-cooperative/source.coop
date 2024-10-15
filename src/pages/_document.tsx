import { Html, Head, Main, NextScript } from "next/document";
import { InitializeColorMode } from "theme-ui";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        ></script>
      </Head>
      <body>
        <InitializeColorMode />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
