import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  // a11y earns its place here: the point of <Field> is label and aria wiring,
  // which is exactly what this addon checks. Jest stays the test runner, so no
  // addon-vitest.
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
};
export default config;
