import { fn } from "storybook/test";
import type * as Real from "../memberships";
import type { FormState } from "@/components/core/DynamicForm";

/**
 * Storybook stand-in for the membership server actions. See
 * `__mocks__/data-connections.ts` for why these exist and how the redirect
 * works.
 *
 * `getPendingInvitation` resolves null — no invitation — because that is the
 * state every other story wants out of its way. A story about the invitation
 * banner overrides it per-story with `.mockResolvedValue()`.
 */
const idle = (): FormState<Record<string, unknown>> => ({
  fieldErrors: {},
  data: new FormData(),
  message: "",
  success: false,
});

export const inviteMember: typeof Real.inviteMember = fn(async () =>
  idle()
).mockName("inviteMember");

export const acceptInvitation: typeof Real.acceptInvitation = fn(async () =>
  idle()
).mockName("acceptInvitation");

export const rejectInvitation: typeof Real.rejectInvitation = fn(async () =>
  idle()
).mockName("rejectInvitation");

export const revokeMembership: typeof Real.revokeMembership = fn(async () =>
  idle()
).mockName("revokeMembership");

export const getPendingInvitation: typeof Real.getPendingInvitation = fn(
  async () => null
).mockName("getPendingInvitation");
