import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import '@/styles/MarkdownViewer.css';
import { Card, Box } from '@radix-ui/themes';
import { SectionHeader } from '@/components/common/SectionHeader';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export function MarkdownViewer({ content, className = '' }: MarkdownViewerProps) {
  // Configure marked with syntax highlighting
  const marked = new Marked(
    markedHighlight({
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      }
    })
  );

  // Parse the markdown to HTML
  const html = marked.parse(content);
  
  return (
    <Card>
      <SectionHeader title="README">
        <Box 
          className={`markdown-viewer ${className}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </SectionHeader>
    </Card>
  );
} 