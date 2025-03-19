import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MarkdownViewer } from '../MarkdownViewer';

// Mock the codeConfig module
jest.mock('../codeConfig', () => ({
  Code: ({ children }: { children: string }) => <code data-testid="code-block">{children}</code>
}));

// Mock react-markdown
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children, components }: { children: string, components: any }) => {
    // Remove extra whitespace and newlines to match actual rendering
    const content = children.replace(/\n+/g, ' ').trim();
    return <div data-testid="markdown">{content}</div>;
  }
}));

// Mock remark-gfm
jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => () => {}
}));

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
    const markdown = screen.getByTestId('markdown');
    expect(markdown).toHaveTextContent(fixtures.plainText);
  });

  it('renders markdown content', () => {
    render(<MarkdownViewer content={fixtures.markdown} />);
    const markdown = screen.getByTestId('markdown');
    // Test for content without caring about exact whitespace
    expect(markdown).toHaveTextContent('# Heading This is **bold** text');
  });

  it('handles code blocks correctly', () => {
    render(<MarkdownViewer content={fixtures.codeBlock} />);
    const markdown = screen.getByTestId('markdown');
    // Test for content without caring about exact whitespace
    expect(markdown).toHaveTextContent('```typescript const x = 1; ```');
  });

  it('throws error if content is not a string', () => {
    // Spy on console.error to verify the error message
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Render should throw
    expect(() => {
      // @ts-expect-error Testing invalid input
      render(<MarkdownViewer content={fixtures.invalidContent} />);
    }).toThrow('MarkdownViewer expects string content, got object');

    // Restore console.error
    consoleSpy.mockRestore();
  });
}); 