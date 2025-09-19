import { Suspense } from "react";
import { Box, Text, Skeleton } from "@radix-ui/themes";
import { FormTitle } from "@/components/core/FormTitle";

interface ProductArchivePageProps {
  params: Promise<{ account_id: string; product_id: string }>;
}

async function ProductArchivePageContent() {
  return (
    <Box>
      <FormTitle
        title="Archive Product"
        description="Archive or delete this product"
      />
      <Box
        style={{
          padding: "24px",
          border: "1px solid var(--gray-6)",
          borderRadius: "8px",
          backgroundColor: "var(--gray-2)",
        }}
      >
        <Text size="3" color="gray">
          Archive settings will be implemented here
        </Text>
      </Box>
    </Box>
  );
}

export default async function ProductArchivePage({
  params,
}: ProductArchivePageProps) {
  return (
    <Suspense
      fallback={
        <Box>
          <Skeleton height="32px" width="200px" mb="2" />
          <Skeleton height="20px" width="300px" mb="6" />
          <Skeleton height="400px" width="100%" />
        </Box>
      }
    >
      <ProductArchivePageContent />
    </Suspense>
  );
}
