import { createOryMiddleware } from "@ory/nextjs/middleware";
import { CONFIG } from "@/lib/config";

// This function can be marked `async` if using `await` inside
export const middleware = createOryMiddleware(CONFIG.auth.config);

// See "Matching Paths" below to learn more
export const config = {};
