import Head from "next/head";
import { useThemeUI } from "theme-ui";

interface MetaProps {
  title?: string;
  description?: string;
  siteName?: string;
  baseUrl?: string;
  image?: string;
}

export function Meta({ 
  title, 
  description,
  siteName = 'Source Cooperative',
  baseUrl = 'https://source.coop',
  image = '' // default image URL could go here
}: MetaProps) {
  const { theme, colorMode } = useThemeUI();
  if (!description) {
    console.warn(
      "a custom description should be used for search engine optimization"
    );
  }
  if (!title) {
    console.warn(
      "a custom title should be used for search engine optimization"
    );
  }
  const fullTitle = title ? `${title} - ${siteName}` : siteName;
  const descriptionProp = description || null;
  const cardProp = image || null;

  return (
    <Head>
      <title key="title">{fullTitle}</title>
      <meta key="description" name="description" content={description} />
      <meta name="viewport" content="initial-scale=1.0, width=device-width, maximum-scale=1" />
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.webmanifest" />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="msapplication-TileImage" content="/img/ms-icon-144x144.png" />
      <meta
        name="color-scheme"
        content={colorMode === "light" ? "light" : "dark"}
      />
      <meta key="og:title" property="og:title" content={fullTitle} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:site_name" property="og:site_name" content={siteName} />
      <meta key="og:url" property="og:url" content={baseUrl} />
      {image && <meta key="og:image" property="og:image" content={image} />}
      <meta key="twitter:title" name="twitter:title" content={fullTitle} />
      <meta key="twitter:description" name="twitter:description" content={description} />
      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      {image && <meta key="twitter:image" name="twitter:image" content={image} />}
      <meta name="format-detection" content="telephone=no" />
    </Head>
  );
}
