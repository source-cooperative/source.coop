import Head from "next/head";
import { useThemeUI } from "theme-ui";

// Define the Meta interface for repository metadata
interface Meta {
  title?: string;
  description?: string;
  image?: string;
  tags?: string[];
}

// Update Repository type to include the Meta interface
interface Repository {
  meta?: Meta;
  // ... other repository properties ...
}

// Export the interface so it can be used elsewhere
export interface MetaProps {
  // Direct props for non-repository pages
  title?: string;
  description?: string;
  image?: string;
  tags?: string[];
  // Repository prop for repository pages
  repository?: Repository;
  // Common props
  siteName?: string;
  baseUrl?: string;
}

export function Meta({ 
  title: directTitle,
  description: directDescription,
  image,
  tags,
  repository,
  siteName = 'Source Cooperative',
  baseUrl = 'https://source.coop'
}: MetaProps) {
  const { theme, colorMode } = useThemeUI();

  // Debug logging
  console.log('Meta component received repository:', {
    title: repository?.meta?.title,
    description: repository?.meta?.description,
    fullRepository: repository
  });

  // Use either repository title or direct title
  const title = repository?.meta?.title || directTitle || siteName;
  const description = repository?.meta?.description || directDescription || '';
  const fullTitle = title ? `${title} - ${siteName}` : siteName;
  const cardProp = image || repository?.meta?.image || null;

  // Debug logging
  console.log('Meta component using:', { title, description });

  return (
    <Head>
      <title key="title">{fullTitle}</title>
      {description && (
        <meta key="description" name="description" content={description} />
      )}
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
      {description && (
        <meta key="og:description" property="og:description" content={description} />
      )}
      <meta key="og:site_name" property="og:site_name" content={siteName} />
      <meta key="og:url" property="og:url" content={baseUrl} />
      {cardProp && <meta key="og:image" property="og:image" content={cardProp} />}
      <meta key="twitter:title" name="twitter:title" content={fullTitle} />
      {description && (
        <meta key="twitter:description" name="twitter:description" content={description} />
      )}
      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      {cardProp && <meta key="twitter:image" name="twitter:image" content={cardProp} />}
      <meta name="format-detection" content="telephone=no" />
    </Head>
  );
}
