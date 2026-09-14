import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  // a11y earns its place here: the point of <Field> is label and aria wiring,
  // which is exactly what this addon checks. Jest stays the test runner, so no
  // addon-vitest.
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  // CONFIG reads these NEXT_PUBLIC_* vars with no fallback, so without them a
  // story rendering a source URL shows "undefined/...", and one rendering an
  // auth link points at the Storybook host instead of auth.source.coop --
  // both read as a bug in the product rather than a gap in the environment.
  // A `define` rather than Storybook's `env`: the Next builder inlines
  // NEXT_PUBLIC_* at build time from the real environment and never sees it.
  // The real public hosts, since these stories are published.
  viteFinal: async (config) => ({
    ...config,
    define: {
      ...config.define,
      "process.env.NEXT_PUBLIC_S3_ENDPOINT": JSON.stringify(
        "https://data.source.coop"
      ),
      "process.env.NEXT_PUBLIC_ORY_UI_URL": JSON.stringify(
        "https://auth.source.coop"
      ),
    },
  }),
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
};
export default config;
