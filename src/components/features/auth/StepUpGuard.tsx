import { redirectIfStepUpRequired } from "@/lib/api/page-session";

/**
 * Renders nothing; signs out users whose Ory session is stuck requiring an AAL2
 * step-up (see redirectIfStepUpRequired). A server component so it can read the
 * request cookie — keep it out of client components.
 */
export async function StepUpGuard() {
  await redirectIfStepUpRequired();
  return null;
}
