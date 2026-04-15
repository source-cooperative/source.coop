import { Text, Heading, Link as RadixLink, Table } from "@radix-ui/themes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Code } from "./codeConfig";
import { HeadingWithPermalink } from "./HeadingWithPermalink";
import "@/styles/MarkdownViewer.css";

interface MarkdownViewerProps {
  content: string;
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
    <div className="markdown-viewer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={{
        h1: ({ children }) => (
          <HeadingWithPermalink
            id={generateHeadingId(String(children))}
            level="8"
            mb="4"
          >
            {children}
          </HeadingWithPermalink>
        ),
        h2: ({ children }) => (
          <HeadingWithPermalink
            id={generateHeadingId(String(children))}
            level="7"
            mb="3"
          >
            {children}
          </HeadingWithPermalink>
        ),
        h3: ({ children }) => (
          <HeadingWithPermalink
            id={generateHeadingId(String(children))}
            level="6"
            mb="2"
          >
            {children}
          </HeadingWithPermalink>
        ),
        h4: ({ children }) => (
          <HeadingWithPermalink
            id={generateHeadingId(String(children))}
            level="5"
            mb="2"
          >
            {children}
          </HeadingWithPermalink>
        ),
        h5: ({ children }) => (
          <HeadingWithPermalink
            id={generateHeadingId(String(children))}
            level="4"
            mb="2"
          >
            {children}
          </HeadingWithPermalink>
        ),
        h6: ({ children }) => (
          <HeadingWithPermalink
            id={generateHeadingId(String(children))}
            level="3"
            mb="2"
          >
            {children}
          </HeadingWithPermalink>
        ),
        p: ({ children }) => (
          <Text as="p" mb="3">
            {children}
          </Text>
        ),
        a: ({ href, children }) => (
          <RadixLink href={href} underline="always">
            {children}
          </RadixLink>
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
          const codeContent = String(children).replace(/\n$/, "");

          // Handle inline code - check if it's single line and has no language class
          if (!className && !codeContent.includes("\n")) {
            return <code className="inline-code">{children}</code>;
          }

          // Use Bright for code blocks (multiline or has language class)
          return <Code lang={lang}>{codeContent}</Code>;
        },
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
