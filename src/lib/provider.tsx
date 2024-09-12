/** @jsxImportSource theme-ui */

import { ThemeProvider, Heading, Paragraph, Card } from "theme-ui";
import Prism from "@theme-ui/prism";
import { useThemedStylesWithMdx } from "@theme-ui/mdx";
import type { ComponentPropsWithoutRef } from "react";
import SourceLink from "@/components/SourceLink";
import { CodeBlock, InlineCode } from "@/components/CodeBlock";

function createLinks({ ...props }) {
  return <SourceLink href={props.href}>{props.children}</SourceLink>;
}

const createHeadingWithLink =
  (Level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") =>
  (props: ComponentPropsWithoutRef<typeof Heading>) =>
    (
      <Heading as={Level} {...props}>
        {props.children}
      </Heading>
    );

export const components = {
  h1: createHeadingWithLink("h2"),
  h2: createHeadingWithLink("h3"),
  h3: createHeadingWithLink("h4"),
  h4: createHeadingWithLink("h5"),
  h5: createHeadingWithLink("h6"),
  h6: createHeadingWithLink("h6"),
  a: createLinks,
  p: ({ children }) => <Paragraph>{children}</Paragraph>,
  blockquote: ({ children }) => <Card variant="blockquote">{children}</Card>,
  code: ({ children, className }) => {
    return children.indexOf("\n") == -1 ? (
      <InlineCode>
        <Prism children={children} className={className} />
      </InlineCode>
    ) : (
      <CodeBlock copyButton={true}>
        <Prism children={children} className={className} />
      </CodeBlock>
    );
  },
};

export function SourceComponents() {
  return useThemedStylesWithMdx(components);
}

export function SourceProvider({ children, theme, components }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
