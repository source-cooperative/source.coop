import { Session } from "@ory/client-fetch";
import { LOGGER } from "@/lib/logging";

/**
 * Get the Ory ID from an Ory session
 * @param session - The Ory session object
 * @returns The Ory ID or null if not found
 */
export function getOryId(session: Session): string | null {
  const oryId = session.identity?.id;
  if (!oryId) {
    LOGGER.warn("No identity ID found in session", {
      operation: "getApiSession",
      context: "session",
    });
    return null;
  }
  return oryId;
}
