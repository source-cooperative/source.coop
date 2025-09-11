import { Box, Heading, Text } from "@radix-ui/themes";

interface FormTitleProps {
  title: string;
  description: string;
}

export function FormTitle({ title, description }: FormTitleProps) {
  return (
    <Box mb="4">
      <Heading size="8" mb="1">
        {title}
      </Heading>
      <Text size="2" color="gray">
        {description}
      </Text>
    </Box>
  );
}
