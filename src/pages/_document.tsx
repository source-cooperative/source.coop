import { Html, Head, Main, NextScript } from "next/document";
import { InitializeColorMode } from "theme-ui";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a"
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
