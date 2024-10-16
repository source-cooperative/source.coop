import { Card, Box } from "theme-ui";
import { useCopyToClipboard } from "usehooks-ts";
import SVG from "./SVG";
import { toast } from "react-hot-toast";
import { useRef, useState } from "react";

export function ClipboardIcon() {
  return (
    <SVG
      viewBox="0 0 16 16"
      sx={{ fill: "primary", "&:hover": { fill: "secondary" } }}
    >
      <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z" />
      <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z" />
    </SVG>
  );
}

export function ClipboardCopiedIcon() {
  return (
    <SVG
      viewBox="0 0 16 16"
      sx={{ fill: "primary", "&:hover": { fill: "secondary" } }}
    >
      <path
        fill-rule="evenodd"
        d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0"
      />
      <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z" />
      <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z" />
    </SVG>
  );
}

function copyToClipboard(container) {
  return container.current.innerText;
}

export function InlineCode(element) {
  const { children, className } = element.children.props;
  // @ts-ignore
  return (
    <Card
      variant="inlineCode"
      onClick={(e) => {
        // @ts-ignore
        window.getSelection().selectAllChildren(e.target);
      }}
    >
      {children}
    </Card>
  );
}

export function CodeBlock({ children, copyButton, ...props }) {
  const [value, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef(null);
  return (
    <Card variant="code" {...props}>
      {copyButton ? (
        <Box
          sx={{
            pl: 1,
            pb: 1,
            width: "19px",
            height: "19px",
            position: "absolute",
            right: 1,
            top: 1,
            zIndex: 999,
            cursor: "pointer",
            backgroundColor: "muted",
          }}
          onClick={(e) => {
            setCopied(true);
            copy(copyToClipboard(buttonRef));
          }}
        >
          {copied ? <ClipboardCopiedIcon /> : <ClipboardIcon />}
        </Box>
      ) : (
        <></>
      )}
      <Box ref={buttonRef}>{children}</Box>
    </Card>
  );
}
