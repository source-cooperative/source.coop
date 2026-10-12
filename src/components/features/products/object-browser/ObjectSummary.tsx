import { DataList, Flex, Button, Box } from "@radix-ui/themes";
import { DownloadIcon } from "@radix-ui/react-icons";
import type {
  DataConnection,
  Product,
  ProductMirror,
  ProductObject,
} from "@/types";
import { DateText } from "@/components/display";
import { ChecksumVerifier } from "../ChecksumVerifier";
import { MonoText } from "@/components/core/MonoText";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";
import { fileSourceUrl } from "@/lib/urls";
import { formatBytes } from "@/lib/format";
import { useTranslations } from "next-intl";

interface ObjectSummaryProps {
  product: Product;
  objectInfo: ProductObject;
  connectionDetails?: {
    primaryMirror: ProductMirror;
    dataConnection: DataConnection;
  };
}

export function ObjectSummary({
  product,
  objectInfo,
  connectionDetails,
}: ObjectSummaryProps) {
  const t = useTranslations("ObjectSummary");
  const details = connectionDetails?.dataConnection.details;
  const prefix = connectionDetails?.primaryMirror.prefix;
  const cloudUri =
    details?.provider === "azure"
      ? `https://${details.account_name}.blob.core.windows.net/${details.container_name}/${prefix}${objectInfo.path}`
      : details?.provider === "s3"
      ? `s3://${details.bucket}/${prefix}${objectInfo.path}`
      : undefined;
  const sourceUrl = fileSourceUrl({
    account_id: product.account_id,
    product_id: product.product_id,
    object_path: objectInfo.path,
  });

  return (
    <>
      <DataList.Root>
        <DataList.Item>
          <DataList.Label>{t("name")}</DataList.Label>
          <DataList.Value>
            <MonoText>
              {objectInfo.path.split("/").filter(Boolean).pop()}
            </MonoText>
          </DataList.Value>
        </DataList.Item>

        <DataList.Item>
          <DataList.Label>{t("size")}</DataList.Label>
          <DataList.Value>
            <MonoText>{formatBytes(objectInfo.size)}</MonoText>
          </DataList.Value>
        </DataList.Item>

        <DataList.Item>
          <DataList.Label>{t("contentType")}</DataList.Label>
          <DataList.Value>
            <MonoText>{objectInfo.mime_type}</MonoText>
          </DataList.Value>
        </DataList.Item>

        <DataList.Item>
          <DataList.Label>{t("lastModified")}</DataList.Label>
          <DataList.Value>
            <MonoText>
              <DateText date={objectInfo.updated_at} includeTime={true} />
            </MonoText>
          </DataList.Value>
        </DataList.Item>

        {objectInfo.metadata &&
          objectInfo.metadata.sha256 &&
          product.account && (
            <DataList.Item>
              <DataList.Label minWidth="120px">{t("checksum")}</DataList.Label>
              <DataList.Value>
                <Flex align="center" gap="2">
                  <ChecksumVerifier
                    objectUrl={`/api/${product.account.account_id}/${product.product_id}/objects/${objectInfo.path}`}
                    expectedHash={objectInfo.metadata.sha256}
                    algorithm="SHA-256"
                  />
                  <CopyToClipboard text={objectInfo.metadata.sha256} />
                </Flex>
              </DataList.Value>
            </DataList.Item>
          )}

        <DataList.Item>
          <DataList.Label>{t("sourceUrl")}</DataList.Label>
          <DataList.Value>
            <Flex align="center" gap="2">
              <MonoText style={{ wordBreak: "break-all" }}>
                {sourceUrl}
              </MonoText>
              <CopyToClipboard text={sourceUrl} />
            </Flex>
          </DataList.Value>
        </DataList.Item>

        {cloudUri && (
          <DataList.Item>
            <DataList.Label>{t("cloudUri")}</DataList.Label>
            <DataList.Value>
              <Flex align="center" gap="2">
                <MonoText style={{ wordBreak: "break-all" }}>
                  {cloudUri}
                </MonoText>
                <CopyToClipboard text={cloudUri} />
              </Flex>
            </DataList.Value>
          </DataList.Item>
        )}
      </DataList.Root>

      {/* Download Button */}
      <Box mt="4" style={{ paddingTop: "var(--space-4)" }}>
        <Button variant="solid" size="3" asChild>
          <a
            href={sourceUrl}
            download={objectInfo.path.split("/").filter(Boolean).pop()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <DownloadIcon />
            {t("download")}
          </a>
        </Button>
      </Box>
    </>
  );
}
