import { Suspense } from "react";
import { Box, Text, Skeleton } from "@radix-ui/themes";
import { FormTitle } from "@/components/core/FormTitle";

interface ProductVisibilityPageProps {
  params: Promise<{ account_id: string; product_id: string }>;
}

export default async function ProductVisibilityPage() {
  return (
    <Suspense>
      <Box>
        <FormTitle
          title="Visibility Settings"
          description="Control how this product appears to others"
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
            Visibility settings will be implemented here
          </Text>
        </Box>
      </Box>
    </Suspense>
  );
}
