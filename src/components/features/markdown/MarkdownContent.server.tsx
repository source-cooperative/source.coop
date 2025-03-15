import { Box } from '@radix-ui/themes';
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

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  if (typeof content !== 'string') {
    throw new Error(`MarkdownContent expects string content, got ${typeof content}`);
  }

  return (
    <Box className="markdown-viewer">
      <SectionHeader title="README">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children }) {
              const match = /language-(\w+)/.exec(className || '');
              const lang = match ? match[1] : '';
              
              // Handle inline code
              if (!className) {
                return <code className="inline-code">{children}</code>;
              }
              
              // Use Bright for code blocks
              return (
                <Code lang={lang} data-code-block>
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