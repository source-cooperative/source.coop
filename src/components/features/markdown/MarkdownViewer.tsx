import {
  Text,
  Heading,
  Link as RadixLink,
  Card,
  Table,
} from "@radix-ui/themes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Code } from "./codeConfig";
import { SectionHeader } from "@/components/core";
import "@/styles/MarkdownViewer.css";

interface MarkdownViewerProps {
  content: string;
}

// Sanitization schema that allows images while maintaining security
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: ["src", "alt", "title", "width", "height"],
  },
  tagNames: [...(defaultSchema.tagNames || []), "img"],
};

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  if (typeof content !== "string") {
    throw new Error(
      `MarkdownViewer expects string content, got ${typeof content}`
    );
  }

  return (
    <Card>
      <SectionHeader title="README">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
          components={{
            h1: ({ children }) => (
              <Heading size="8" mb="4">
                {children}
              </Heading>
            ),
            h2: ({ children }) => (
              <Heading size="7" mb="3">
                {children}
              </Heading>
            ),
            h3: ({ children }) => (
              <Heading size="6" mb="2">
                {children}
              </Heading>
            ),
            h4: ({ children }) => (
              <Heading size="5" mb="2">
                {children}
              </Heading>
            ),
            h5: ({ children }) => (
              <Heading size="4" mb="2">
                {children}
              </Heading>
            ),
            h6: ({ children }) => (
              <Heading size="3" mb="2">
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
            code({ className, children }) {
              const match = /language-(\w+)/.exec(className || "");
              const lang = match ? match[1] : "";

              // Handle inline code
              if (!className) {
                return <code className="inline-code">{children}</code>;
              }

              // Use Bright for code blocks
              return (
                <Code lang={lang}>{String(children).replace(/\n$/, "")}</Code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </SectionHeader>
    </Card>
  );
}
