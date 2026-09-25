/**
 * @openapi
 * /api-keys/{access_key_id}/auth:
 *   get:
 *     tags: [API Keys, Authentication]
 *     summary: Fetch API Key details
 *     deprecated: true
 *     description: Retired. Legacy API keys grant no access, so there is nothing to authenticate with one; this route reads nothing and returns no secret.
 *     parameters:
 *       - in: path
 *         name: access_key_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The access key ID to authenticate with
 *     responses:
 *       410:
 *         description: Gone - legacy API keys are retired
 */
import { legacyApiKeysGone } from "@/lib/api/legacy-api-keys";

export const GET = legacyApiKeysGone;
