// Copyright © 2024 Ory Corp
// SPDX-License-Identifier: Apache-2.0

import { createOryMiddleware } from "@ory/nextjs/middleware";
import { CONFIG } from "@/lib/config";

// This function can be marked `async` if using `await` inside
export const middleware = createOryMiddleware(CONFIG.auth.config);

// See "Matching Paths" below to learn more
export const config = {};
