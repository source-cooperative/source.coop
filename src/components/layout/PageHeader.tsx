import { Heading, Text, Box } from "@radix-ui/themes";

interface PageHeaderProps {
  title: string;
  description?: string;
  headingSize?: "6" | "7" | "8";
}

export function PageHeader({
  title,
  description,
  headingSize = "6",
}: PageHeaderProps) {
  return (
    <Box>
      <Heading size={headingSize} mb="2">
        {title}
      </Heading>
      {description && (
        <Text as="p" size="3" color="gray" mb="6">
          {description}
        </Text>
      )}
    </Box>
  );
}
