import { Card } from "@radix-ui/themes";
import { MarkdownViewer } from "@/components/features/markdown";

const testMarkdown = `# Short Heading

This is a test paragraph.

## Medium Length Heading Test

Another test paragraph.

### This is a Longer Heading That Has More Words In It

Testing with more content.

#### This is a Very Long Heading That Might Wrap to Multiple Lines on Smaller Screens or in Narrow Containers

More test content below.

##### An Extremely Long Heading That Definitely Will Wrap on Most Screen Sizes and We Need to Test How This Behaves With Anchor Links

Even more content.

###### Overture Buildings & Places (Cloud-Native Geo experiments)

This mimics the real-world example from the issue.

## Another Very Long Heading With Many Words That Could Potentially Cause Layout Issues When Anchor Links Appear on Hover Because It Takes Up Multiple Lines

Final test paragraph.
`;

export default function TestHeadingAnchorsPage() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "1rem" }}>Heading Anchors Test Page</h1>
      <p style={{ marginBottom: "2rem", maxWidth: "600px" }}>
        This page tests heading anchors with various lengths to ensure no text
        reflow occurs on hover. Try resizing the window to test different widths.
      </p>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Full Width Container</h2>
        <Card>
          <MarkdownViewer content={testMarkdown} />
        </Card>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Narrow Container (400px)</h2>
        <div style={{ maxWidth: "400px" }}>
          <Card>
            <MarkdownViewer content={testMarkdown} />
          </Card>
        </div>
      </div>
    </div>
  );
}
