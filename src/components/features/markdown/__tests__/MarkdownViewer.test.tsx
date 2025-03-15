import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MarkdownViewer } from '../MarkdownViewer';

// Test fixtures
const fixtures = {
  plainText: 'This is a test',
  markdown: '# Heading\n\nThis is **bold** text',
  codeBlock: '```typescript\nconst x = 1;\n```',
  invalidContent: { text: 'This should fail' }
};

describe('MarkdownViewer', () => {
  it('renders plain text markdown correctly', () => {
    render(<MarkdownViewer content={fixtures.plainText} />);
    expect(screen.getByText(fixtures.plainText)).toBeInTheDocument();
  });

  it('renders markdown formatting correctly', () => {
    render(<MarkdownViewer content={fixtures.markdown} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading');
    expect(screen.getByText('bold')).toHaveStyle({ fontWeight: 'bold' });
  });

  it('handles code blocks correctly', () => {
    render(<MarkdownViewer content={fixtures.codeBlock} />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('throws error if content is not a string', () => {
    expect(() => {
      // @ts-expect-error Testing invalid input
      render(<MarkdownViewer content={fixtures.invalidContent} />);
    }).toThrow('MarkdownViewer expects string content, got object');
  });
}); 