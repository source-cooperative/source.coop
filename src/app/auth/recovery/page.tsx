import { Recovery } from "@ory/elements-react/theme";
import { enhanceOryConfig } from "@ory/nextjs";
import { getRecoveryFlow, OryPageParams } from "@ory/nextjs/app";
import type { RecoveryFlow } from "@ory/client-fetch";

import CustomCardHeader from "@/components/custom-card-header";
import { CONFIG } from "@/lib/config";

export default async function RecoveryPage(props: OryPageParams) {
  const config = enhanceOryConfig(CONFIG.auth.config);
  const flow = await getRecoveryFlow(props.searchParams);

  if (!flow) {
    return null;
  }

  return (
    <Recovery
      flow={flow as unknown as RecoveryFlow}
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
