const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFiles: ["<rootDir>/jest.polyfills.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^sinon$": "sinon/pkg/sinon.js",
    "^sb-original/image-context$": "<rootDir>/__mocks__/sb-original-image-context.ts",
  },
  testMatch: ["**/*.test.ts?(x)", "**/__tests__/**/*.ts?(x)"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx|mjs)$": ["babel-jest", { presets: ["next/babel"] }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@storybook/[^/]+|storybook|react-markdown|bright|vfile|vfile-message|unist-.*|unified|bail|is-plain-obj|trough|remark-.*|mdast-util-.*|micromark.*|decode-named-character-reference|character-entities|property-information|hast-util-whitespace|space-separated-tokens|comma-separated-tokens|pretty-bytes|aws-sdk-client-mock|sinon|jose)/)",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{js,jsx,ts,tsx}",
    "!src/**/*.test.{js,jsx,ts,tsx}",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async.
// Resolved rather than exported directly because next/jest prepends its own
// node_modules ignore, and transformIgnorePatterns are OR'd: its pattern ignores
// everything under node_modules whatever our allowlist says, so an ESM-only
// dependency (@storybook/nextjs-vite, reached by the story smoke test) never
// gets transformed. Ours is the list that governs; the CSS-module pattern is
// next/jest's and has to survive.
module.exports = async () => {
  const config = await createJestConfig(customJestConfig)();
  config.transformIgnorePatterns = [
    ...customJestConfig.transformIgnorePatterns,
    "^.+\\.module\\.(css|sass|scss)$",
  ];
  return config;
};
