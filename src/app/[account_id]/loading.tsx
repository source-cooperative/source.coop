import { Container, Box, Flex, Grid } from "@radix-ui/themes";
import { Skeleton } from "@/components/core";

export default function AccountPageLoading() {
  return (
    <Container size="4" py="6">
      <Box>
        {/* Profile Actions Skeleton */}
        <Box mb="6">
          <Flex gap="2" justify="end">
            <Skeleton height="32px" width="100px" />
            <Skeleton height="32px" width="120px" />
          </Flex>
        </Box>

        {/* Profile Header Skeleton */}
        <Box mb="6">
          <Flex gap="4" align="center" justify="between">
            <Flex gap="4" align="center">
              {/* Avatar Skeleton */}
              <Skeleton height="64px" width="64px" className="rounded-full" />
              
              <Box>
                <Flex gap="2" align="center" mb="2">
                  {/* Name Skeleton */}
                  <Skeleton height="32px" width="200px" />
                  {/* Email Verification Status Skeleton */}
                  <Skeleton height="20px" width="100px" />
                </Flex>
                {/* Bio Skeleton */}
                <Skeleton height="16px" width="300px" />
              </Box>
            </Flex>
          </Flex>
        </Box>

        {/* Metadata Grid Skeleton */}
        <Box mb="6">
          <Grid columns="3" gap="4">
            {/* Website Skeleton */}
            <Box>
              <Skeleton height="14px" width="60px" mb="2" />
              <Skeleton height="16px" width="120px" />
            </Box>
            {/* ORCID Skeleton */}
            <Box>
              <Skeleton height="14px" width="40px" mb="2" />
              <Skeleton height="16px" width="100px" />
            </Box>
            {/* Third column placeholder */}
            <Box>
              <Skeleton height="14px" width="80px" mb="2" />
              <Skeleton height="16px" width="140px" />
            </Box>
          </Grid>
        </Box>

        {/* Organizations Section Skeleton */}
        <Box mb="6">
          <Skeleton height="24px" width="120px" mb="2" />
          <Grid columns="3" gap="4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Flex key={index} gap="2" align="center">
                <Skeleton height="24px" width="24px" className="rounded-full" />
                <Skeleton height="16px" width={`${80 + Math.random() * 60}px`} />
              </Flex>
            ))}
          </Grid>
        </Box>

        {/* Products Section Skeleton */}
        <Box mb="6">
          <Skeleton height="24px" width="80px" mb="2" />
          
          {/* Product List Skeleton */}
          <Box>
            {Array.from({ length: 4 }).map((_, index) => (
              <Box
                key={index}
                p="4"
                mb="4"
                style={{
                  border: "1px solid var(--gray-5)",
                  borderRadius: "var(--radius-3)",
                  background: "var(--gray-1)",
                }}
              >
                {/* Product Title */}
                <Skeleton height="20px" width={`${60 + Math.random() * 30}%`} mb="2" />
                
                {/* Product Description */}
                <Box mb="3">
                  <Skeleton height="14px" width="90%" mb="1" />
                  <Skeleton height="14px" width={`${70 + Math.random() * 20}%`} />
                </Box>
                
                {/* Metadata Row */}
                <Flex gap="3" align="center">
                  <Skeleton height="12px" width="60px" />
                  <Skeleton height="12px" width="100px" />
                  <Skeleton height="16px" width="50px" />
                </Flex>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Contributions Section Skeleton */}
        <Box>
          <Skeleton height="24px" width="120px" mb="2" />
          
          {/* Contribution List Skeleton */}
          <Box>
            {Array.from({ length: 2 }).map((_, index) => (
              <Box
                key={index}
                p="4"
                mb="4"
                style={{
                  border: "1px solid var(--gray-5)",
                  borderRadius: "var(--radius-3)",
                  background: "var(--gray-1)",
                }}
              >
                {/* Contribution Title */}
                <Skeleton height="18px" width={`${50 + Math.random() * 40}%`} mb="2" />
                
                {/* Contribution Description */}
                <Box mb="3">
                  <Skeleton height="14px" width="85%" mb="1" />
                  <Skeleton height="14px" width={`${60 + Math.random() * 30}%`} />
                </Box>
                
                {/* Metadata Row */}
                <Flex gap="3" align="center">
                  <Skeleton height="12px" width="70px" />
                  <Skeleton height="12px" width="110px" />
                  <Skeleton height="16px" width="45px" />
                </Flex>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
