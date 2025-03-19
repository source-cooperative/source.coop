import React from 'react';
import { Code } from 'bright';

interface CodeBlockProps {
  children: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  metastring?: string;
}

// Configure Bright themes
Code.theme = {
  light: 'github-light',
  dark: 'github-dark'
};

export default function CodeBlock({ 
  children, 
  language,
  title,
  showLineNumbers = false
}: CodeBlockProps): JSX.Element {
  return (
    <div style={{ 
      margin: '1rem 0',
      borderRadius: 'var(--radius-3)',
      overflow: 'hidden'
    }}>
      {title && (
        <div style={{
          padding: '0.5rem 1rem',
          backgroundColor: 'var(--gray-3)',
          borderBottom: '1px solid var(--gray-5)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.875rem'
        }}>
          {title}
        </div>
      )}
      <Code 
        lang={language || 'text'} 
        lineNumbers={showLineNumbers}
        style={{
          fontSize: '0.875rem',
          padding: '1rem'
        }}
      >
        {children}
      </Code>
    </div>
  );
} 