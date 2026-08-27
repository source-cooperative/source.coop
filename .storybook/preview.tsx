import React from "react";
import type { Preview } from "@storybook/nextjs-vite";
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

// Mirrors src/styles/theme.tsx. Without it every Radix control renders
// unstyled, and a story would tell you nothing about how the app looks.
const themeProps = {
  accentColor: "gray",
  grayColor: "gray",
  radius: "none",
  scaling: "110%",
} as const;

const preview: Preview = {
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
      return (
        <Theme {...themeProps} appearance={appearance}>
          <div style={{ padding: 24, maxWidth: 720 }}>
            <Story />
          </div>
        </Theme>
      );
    },
  ],
};

export default preview;
