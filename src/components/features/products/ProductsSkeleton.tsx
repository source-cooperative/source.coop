import { Box, Skeleton, Flex } from "@radix-ui/themes";
import styles from "./ProductList.module.css";

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
          <ul className={styles.list}>
            {Array.from({ length: 5 }).map((_, index) => (
              <li key={index}>
                <div className={styles.item}>
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
                  <div className={styles.metadata}>
                    <Skeleton style={{ width: "120px", height: "0.875rem" }} />
                    <Skeleton style={{ width: "100px", height: "0.875rem" }} />
                    <Skeleton style={{ width: "60px", height: "1.5rem" }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </Box>
  );
}
