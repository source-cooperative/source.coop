import { Box, Skeleton, Flex } from "@radix-ui/themes";

interface ProductsSkeletonProps {
  showFilters?: boolean;
}

export function ProductsSkeleton({
  showFilters = true,
}: ProductsSkeletonProps) {
  return (
    <Box>
      {/* Search and Filters Skeleton - only show when showFilters is true */}
      {showFilters && (
        <Box mb="6">
          <Flex gap="3" mb="4" wrap="wrap">
            <Skeleton style={{ width: "300px", height: "40px" }} />
            <Skeleton style={{ width: "250px", height: "40px" }} />
          </Flex>
        </Box>
      )}

      {/* Products List Skeleton - using the same structure as ProductListItem */}
      <div>
        <nav aria-label="Product list loading">
          <Box
            asChild
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              width: "100%",
              position: "relative",
              contain: "content"
            }}
          >
            <ul>
              {Array.from({ length: 5 }).map((_, index) => (
                <li key={index}>
                  <Box
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      display: "block",
                      padding: "var(--space-4)",
                      borderRadius: "var(--radius-3)",
                        border: "1px solid var(--gray-5)",
  background: "var(--gray-1)",
                      transition: "border-color 0.15s ease-in-out",
                      outline: "2px solid transparent",
                      outlineOffset: "-1px",
                      marginBottom: "var(--space-4)",
                      contain: "content"
                    }}
                  >
                    {/* Product Title */}
                    <Skeleton
                      style={{
                        width: "60%",
                        height: "var(--font-size-5)",
                        marginBottom: "0.5rem",
                      }}
                    />

                    {/* Product Description */}
                    <Skeleton
                      style={{
                        width: "90%",
                        height: "1rem",
                        marginBottom: "1rem",
                      }}
                    />

                    {/* Metadata Row */}
                    <Box
                      style={{
                        display: "flex",
                        gap: "1rem",
                        alignItems: "center",
                        fontSize: "0.875rem",
                        color: "var(--gray-11)"
                      }}
                    >
                      <Skeleton style={{ width: "120px", height: "0.875rem" }} />
                      <Skeleton style={{ width: "100px", height: "0.875rem" }} />
                      <Skeleton style={{ width: "60px", height: "1.5rem" }} />
                    </Box>
                  </Box>
                </li>
              ))}
            </ul>
          </Box>
        </nav>
      </div>
    </Box>
  );
}
