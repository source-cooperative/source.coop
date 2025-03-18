import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MarkdownViewer } from '../MarkdownViewer';
import { Component, PropsWithChildren } from 'react';

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

// Error boundary component for testing
class TestErrorBoundary extends Component<PropsWithChildren<{}>> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return null;
    }
    return this.props.children;
  }
}

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
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <TestErrorBoundary>
        {/* @ts-expect-error Testing invalid input */}
        <MarkdownViewer content={fixtures.invalidContent} />
      </TestErrorBoundary>
    );
    expect(container.innerHTML).toBe('');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
}); 