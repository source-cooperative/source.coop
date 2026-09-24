import { fn } from "storybook/test";
import type * as Real from "../service-accounts";
import { githubWorkflowStep } from "@/lib/services/github-workflow";
import type {
  ServiceAccountActionState,
  ServiceAccountFormState,
} from "@/types";

/**
 * Storybook stand-in for the service-account server actions, redirected to by
 * `sb.mock()` in `.storybook/preview.tsx`. The real module is `"use server"`
 * and brings the AWS SDK with it, so nothing that imports it can render in a
 * browser bundle without this.
 *
 * `createServiceAccount` resolves to a created account trusting each workflow
 * named, so the post-create view is reachable by submitting the form. The
 * lifecycle actions resolve to an idle state.
 */
const idle = (): ServiceAccountActionState => ({ message: "", success: false });

const STEP = githubWorkflowStep("https://data.source.coop", "nightly-sync");

export const createServiceAccount: typeof Real.createServiceAccount = fn(
  async (_prev, formData): Promise<ServiceAccountFormState> => ({
    fieldErrors: {},
    message: "",
    success: true,
    created: {
      account_id: String(formData.get("account_id") || "nightly-sync"),
      name: String(formData.get("name") || "Nightly Sync"),
      trusts: formData.getAll("github_subject").map((subject: FormDataEntryValue) => ({
        subject: String(subject),
        workflow_step: STEP,
      })),
    },
  })
).mockName("createServiceAccount");

export const addGithubTrust: typeof Real.addGithubTrust = fn(
  async (_prev, formData): Promise<ServiceAccountActionState> => ({
    message: "",
    success: true,
    added: {
      subject: String(formData.get("subject") || "repo:miskatonic/archive:ref:refs/heads/main"),
      workflow_step: STEP,
    },
  })
).mockName("addGithubTrust");

export const removeTrust: typeof Real.removeTrust = fn(async () => idle()).mockName("removeTrust");
export const setServiceAccountDisabled: typeof Real.setServiceAccountDisabled = fn(
  async () => idle()
).mockName("setServiceAccountDisabled");
export const deleteServiceAccount: typeof Real.deleteServiceAccount = fn(async () => idle()).mockName(
  "deleteServiceAccount"
);
