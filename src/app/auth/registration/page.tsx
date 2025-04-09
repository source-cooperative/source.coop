import { Registration } from "@ory/elements-react/theme";
import { enhanceOryConfig } from "@ory/nextjs";
import { getRegistrationFlow, OryPageParams } from "@ory/nextjs/app";
import type { RegistrationFlow } from "@ory/client-fetch";

import { CONFIG } from "@/lib/config";

export default async function RegistrationPage(props: OryPageParams) {
  const config = enhanceOryConfig(CONFIG.auth.config);
  const flow = await getRegistrationFlow(props.searchParams);

  if (!flow) {
    return null;
  }

  return (
    <Registration
      flow={flow as unknown as RegistrationFlow}
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
          // Card: {},
        }
      }
    />
  );
}
