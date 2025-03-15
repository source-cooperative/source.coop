import { Box, Text, Heading, Link as RadixLink } from '@radix-ui/themes';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Code } from 'bright';
import { SectionHeader } from '@/components/core';
import '@/styles/MarkdownViewer.css';

// Configure Bright once at module level
Code.theme = {
  dark: 'github-dark',
  light: 'github-light'
};
Code.lineNumbers = true;

interface MarkdownViewerProps {
  content: string;
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  if (typeof content !== 'string') {
    throw new Error(`MarkdownViewer expects string content, got ${typeof content}`);
  }

  return (
    <Box>
      <SectionHeader title="README">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <Heading size="8" mb="4">{children}</Heading>,
            h2: ({ children }) => <Heading size="7" mb="3">{children}</Heading>,
            h3: ({ children }) => <Heading size="6" mb="2">{children}</Heading>,
            h4: ({ children }) => <Heading size="5" mb="2">{children}</Heading>,
            h5: ({ children }) => <Heading size="4" mb="2">{children}</Heading>,
            h6: ({ children }) => <Heading size="3" mb="2">{children}</Heading>,
            p: ({ children }) => <Text as="p" mb="3">{children}</Text>,
            a: ({ href, children }) => <RadixLink href={href}>{children}</RadixLink>,
            code({ className, children }) {
              const match = /language-(\w+)/.exec(className || '');
              const lang = match ? match[1] : '';
              
              // Handle inline code
              if (!className) {
                return <code className="inline-code">{children}</code>;
              }
              
              // Use Bright for code blocks
              return (
                <Code lang={lang}>
                  {String(children).replace(/\n$/, '')}
                </Code>
              );
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </SectionHeader>
    </Box>
  );
} 