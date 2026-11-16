import * as React from "react";

/**
 * Stand-in for `sb-original/image-context`, which @storybook/nextjs-vite's
 * image decorator imports. The real module is a Vite alias the framework's
 * builder creates, so it does not exist outside a Storybook build — and the
 * story smoke test reaches that decorator through Jest. The context only ever
 * carries `parameters.nextjs.image`, which no story here sets.
 */
export const ImageContext = React.createContext({});
