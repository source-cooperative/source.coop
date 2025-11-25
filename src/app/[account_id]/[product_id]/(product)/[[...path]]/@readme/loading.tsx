import { Skeleton } from "@/components/core/Skeleton";
import { SectionHeader } from "@/components";
import { Card } from "@radix-ui/themes";

export default function ReadmeLoading() {
  return (
    <Card mt="4">
      <SectionHeader title="README">
        {/* Title */}
        <Skeleton height="48px" width="60%" mb="4" />

        {/* Paragraph */}
        <Skeleton height="20px" width="100%" mb="2" />
        <Skeleton height="20px" width="95%" mb="2" />
        <Skeleton height="20px" width="90%" mb="4" />

        {/* Heading */}
        <Skeleton height="36px" width="40%" mb="3" />

        {/* Paragraph */}
        <Skeleton height="20px" width="100%" mb="2" />
        <Skeleton height="20px" width="98%" mb="2" />
        <Skeleton height="20px" width="85%" mb="4" />

        {/* Heading */}
        <Skeleton height="32px" width="35%" mb="2" />

        {/* List items */}
        <Skeleton height="20px" width="80%" mb="2" />
        <Skeleton height="20px" width="75%" mb="2" />
        <Skeleton height="20px" width="70%" mb="4" />

        {/* Heading */}
        <Skeleton height="32px" width="30%" mb="2" />

        {/* Paragraph */}
        <Skeleton height="20px" width="100%" mb="2" />
        <Skeleton height="20px" width="92%" mb="4" />
      </SectionHeader>
    </Card>
  );
}
