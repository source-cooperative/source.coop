import { useTranslations } from "next-intl";

interface PreviewIframeProps {
  src: string;
  title: string;
}

/**
 * The embedded external-viewer frame, shared by file previews (COG, image,
 * parquet, ...) and store previews (zarr/icechunk). The "Open in new tab"
 * escape hatch lives on the surrounding card's SectionHeader.
 */
export function PreviewIframe({ src, title }: PreviewIframeProps) {
  const t = useTranslations("PreviewIframe");
  return (
    <iframe
      width="100%"
      height="600px"
      allow="fullscreen"
      style={{ border: "1px solid var(--gray-5)" }}
      src={src}
      title={title}
      loading="lazy"
    >
      {t("unsupported")}
    </iframe>
  );
}
