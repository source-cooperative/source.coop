import { createOryMiddleware } from "@ory/nextjs/middleware";

// This function can be marked `async` if using `await` inside
export const middleware = createOryMiddleware({});

// See "Matching Paths" below to learn more
export const config = {};
