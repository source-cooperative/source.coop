import { Code } from "@radix-ui/themes";

export function TextViewer({ content }: { content: string }) {
  return <Code>{content}</Code>;
}
