import { Verification } from "@ory/elements-react/theme";
import { enhanceOryConfig } from "@ory/nextjs";
import { getVerificationFlow, OryPageParams } from "@ory/nextjs/app";
import type { VerificationFlow } from "@ory/client-fetch";

import CustomCardHeader from "@/components/custom-card-header";
import { CONFIG } from "@/lib/config";

export default async function VerificationPage(props: OryPageParams) {
  const config = enhanceOryConfig(CONFIG.auth.config);
  const flow = await getVerificationFlow(props.searchParams);

  if (!flow) {
    return null;
  }

  // Convert string dates to Date objects
  const processedFlow = {
    ...flow,
    expires_at: flow.expires_at ? new Date(flow.expires_at) : undefined,
  } as VerificationFlow;

  return (
    <Verification
      flow={processedFlow}
      config={{
        ...config,
        project: {
          ...config.project,
          registrationEnabled: config.project.registration_enabled,
          verificationEnabled: config.project.verification_enabled,
          recoveryEnabled: config.project.recovery_enabled,
        },
      }}
      components={
        {
          // Card: {
          //   Header: CustomCardHeader,
          // },
        }
      }
    />
  );
}
