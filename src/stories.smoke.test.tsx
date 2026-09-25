/**
 * Renders every story in the repo once.
 *
 * Storybook is compiled on deploy but never rendered anywhere in CI, so a story
 * that throws -- a renamed prop, a component that starts reading a context its
 * story never provides -- stays broken until someone opens ui.source.coop. This
 * asserts nothing about what a story looks like; the published Storybook is for
 * that. It asserts only that each one still renders.
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import { composeStories, setProjectAnnotations } from "@storybook/nextjs-vite";

// Mirrors the sb.mock() calls in .storybook/preview.tsx. These modules are
// "use server" and pull the AWS SDK in behind them; with no factory argument
// Jest resolves each to its __mocks__ sibling, the same file Storybook
// redirects to. Scoped to this file -- the real modules have their own tests.
jest.mock("@/lib/actions/data-connections");
jest.mock("@/lib/actions/account");
jest.mock("@/lib/actions/product-mirrors");
jest.mock("@/lib/actions/products");
jest.mock("@/lib/actions/memberships");
jest.mock("@/lib/actions/service-accounts");

// Storybook's builder aliases next/navigation to this mock. Jest has no such
// alias, so the real module comes through and its hooks are undefined outside
// a Next render.
jest.mock("next/navigation", () =>
  require("@storybook/nextjs-vite/navigation.mock")
);

// jsdom has no ResizeObserver, and Radix's Select measures its trigger with one.
global.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// The decorators and parameters the stories are written against: the Radix
// Theme they expect to be inside, and nextjs.appDirectory.
import preview from "../.storybook/preview";

const annotations = setProjectAnnotations([preview]);
beforeAll(annotations.beforeAll);

/**
 * Stories Jest cannot render, for reasons that are the environment's and not
 * the story's:
 *
 * - LiveGlobe draws through react-globe.gl and three, both ESM-only and both
 *   needing a WebGL context jsdom does not have.
 * - Everything built on DynamicForm calls React 19's `useActionState`. Next
 *   and Storybook both run the React that Next bundles; Jest resolves the
 *   React 18 in package.json, where the hook does not exist.
 */
const CANNOT_RENDER_UNDER_JEST =
  /LiveGlobe|DynamicForm|DataConnectionForm|ProductMirrorsManager|ProductCreationForm|EditProfileForm|MembershipsTable|ServiceAccountForm|ServiceAccountDetail|AddGithubTrustDialog/;

const storyFiles = readdirSync(__dirname, {
  recursive: true,
  encoding: "utf8",
})
  .filter((file) => file.endsWith(".stories.tsx"))
  .filter((file) => !CANNOT_RENDER_UNDER_JEST.test(file));

test("the story glob still finds stories", () => {
  expect(storyFiles.length).toBeGreaterThan(0);
});

describe.each(storyFiles)("%s", (file) => {
  const stories = composeStories(require(path.join(__dirname, file)));

  // run() rather than render(): it is what applies the project's beforeEach,
  // where the next/navigation router mock the decorators expect is installed.
  // A plain render throws "Router not initialized" instead.
  test.each(Object.keys(stories))("%s renders", async (name) => {
    await stories[name as keyof typeof stories].run();
  });
});
