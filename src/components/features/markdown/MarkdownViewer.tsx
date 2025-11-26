import {
  Text,
  Heading,
  Link as RadixLink,
  Table,
  Theme,
} from "@radix-ui/themes";
import { MarkdownAsync } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStarryNight from "rehype-starry-night";
import "@/styles/starry-night-theme.css";

interface MarkdownViewerProps {
  content: string;
  clientSide?: boolean;
}

// Utility function to convert heading text to URL-friendly ID
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .trim();
}

export async function MarkdownViewer({ content }: MarkdownViewerProps) {
  if (typeof content !== "string") {
    throw new Error(
      `MarkdownViewer expects string content, got ${typeof content}`
    );
  }

  return (
    <MarkdownAsync
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[
        rehypeRaw,
        [
          rehypeSanitize,
          // Sanitization schema that allows images while maintaining security
          {
            ...defaultSchema,
            attributes: {
              ...defaultSchema.attributes,
              img: ["src", "alt", "title", "width", "height"],
            },
            tagNames: [...(defaultSchema.tagNames || []), "img"],
          },
        ],
        rehypeStarryNight,
      ]}
      components={{
        h1: ({ children }) => (
          <Heading size="8" mb="4" id={generateHeadingId(String(children))}>
            {children}
          </Heading>
        ),
        h2: ({ children }) => (
          <Heading size="7" mb="3" id={generateHeadingId(String(children))}>
            {children}
          </Heading>
        ),
        h3: ({ children }) => (
          <Heading size="6" mb="2" id={generateHeadingId(String(children))}>
            {children}
          </Heading>
        ),
        h4: ({ children }) => (
          <Heading size="5" mb="2" id={generateHeadingId(String(children))}>
            {children}
          </Heading>
        ),
        h5: ({ children }) => (
          <Heading size="4" mb="2" id={generateHeadingId(String(children))}>
            {children}
          </Heading>
        ),
        h6: ({ children }) => (
          <Heading size="3" mb="2" id={generateHeadingId(String(children))}>
            {children}
          </Heading>
        ),
        p: ({ children }) => (
          <Text as="p" mb="3">
            {children}
          </Text>
        ),
        a: ({ href, children }) => (
          <RadixLink href={href}>{children}</RadixLink>
        ),
        table: ({ children }) => (
          <Table.Root mb="3" variant="surface">
            {children}
          </Table.Root>
        ),
        thead: ({ children }) => <Table.Header>{children}</Table.Header>,
        tbody: ({ children }) => <Table.Body>{children}</Table.Body>,
        tr: ({ children }) => <Table.Row>{children}</Table.Row>,
        th: ({ children }) => (
          <Table.ColumnHeaderCell>{children}</Table.ColumnHeaderCell>
        ),
        td: ({ children }) => <Table.Cell>{children}</Table.Cell>,
        code: ({ children }) => (
          <Theme scaling="90%">
            <code>{children}</code>
          </Theme>
        ),
      }}
    >
      {content}
    </MarkdownAsync>
  );
}
