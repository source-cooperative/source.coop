import React from "react";
import type { Preview } from "@storybook/nextjs-vite";
import { sb } from "storybook/test";
import { Theme } from "@radix-ui/themes";
import { IBM_Plex_Sans } from "next/font/google";
import "@radix-ui/themes/styles.css";
import "../src/styles/globals.css";

// globals.css points --default-font-family at --font-ibm-plex, which only
// exists because the root layout puts next/font's generated class on <body>.
// Without it that var() is invalid at computed-value time and every control
// falls back to the browser serif.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
});

// On <html>, not on a decorator wrapper: Radix portals Select.Content,
// DropdownMenu and Dialog to document.body, outside any element the decorator
// renders. A custom property set on a wrapper never reaches them, which left
// portalled menus rendering serif while the page around them was correct.
if (typeof document !== "undefined") {
  document.documentElement.classList.add(ibmPlexSans.variable);
}

// Server actions cannot be imported into a browser bundle: the module is
// "use server" and pulls the AWS SDK with it, so any component that imports one
// dies on `__filename is not defined` before it renders. Redirecting the module
// to its __mocks__ sibling is what lets those components have stories at all.
// No production code changes to support this -- the redirect applies to the
// Storybook build only.
sb.mock("../src/lib/actions/data-connections.ts");
// Reached through the @/components/core barrel, which re-exports
// AccountSearchInput -- so this is needed by stories that never mention an
// account, including the connection form.
sb.mock("../src/lib/actions/account.ts");
sb.mock("../src/lib/actions/product-mirrors.ts");
sb.mock("../src/lib/actions/products.ts");
sb.mock("../src/lib/actions/memberships.ts");

// Mirrors src/styles/theme.tsx. Without it every Radix control renders
// unstyled, and a story would tell you nothing about how the app looks.
const themeProps = {
  accentColor: "gray",
  grayColor: "gray",
  radius: "none",
  scaling: "110%",
} as const;

const preview: Preview = {
  // A docs page per component: the JSDoc above `meta`, a props table from the
  // types, and each story's source. Without it addon-docs has no page to fill.
  tags: ["autodocs"],
  parameters: {
    // DynamicForm calls useRouter from next/navigation; without this the app
    // router mock is never mounted and the story throws
    // "invariant expected app router to be mounted".
    nextjs: { appDirectory: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'error' fails CI on violations; leave at 'todo' until the backlog is
      // clear, then turn it up.
      test: "todo",
    },
  },
  globalTypes: {
    appearance: {
      description: "Radix theme appearance",
      defaultValue: "light",
      toolbar: {
        title: "Appearance",
        icon: "mirror",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const appearance = context.globals.appearance as "light" | "dark";
      // .radix-themes is min-height:100vh -- right for one story to a frame,
      // but a docs page stacks them into screens of whitespace.
      const fillsFrame = context.viewMode !== "docs";
      return (
        <Theme
          {...themeProps}
          appearance={appearance}
          style={fillsFrame ? undefined : { minHeight: 0 }}
        >
          <div style={{ padding: 24, maxWidth: 720 }}>
            <Story />
          </div>
        </Theme>
      );
    },
  ],
};

export default preview;
