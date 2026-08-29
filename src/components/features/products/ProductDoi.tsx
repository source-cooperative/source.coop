import { Text, Flex, Code } from "@radix-ui/themes";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";

interface ProductDoiProps {
  doi: string;
}

/**
 * A DOI is one long unbreakable token, so on a phone it pushed this row wider
 * than the viewport. `truncate` clips it to the row instead; the full value
 * stays reachable through the title and the copy button.
 */
export function ProductDoi({ doi }: ProductDoiProps) {
  return (
    <Text size="2" color="gray">
      <Flex align="center" gap="2" my="4">
        <strong>DOI:</strong>{" "}
        <Code truncate title={doi}>
          {doi}
        </Code>
        <CopyToClipboard text={doi} />
      </Flex>
    </Text>
  );
}
