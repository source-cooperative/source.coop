import { Login } from "@ory/elements-react/theme";
import { enhanceOryConfig } from "@ory/nextjs";
import { getLoginFlow, OryPageParams } from "@ory/nextjs/app";

import { CONFIG } from "@/lib/config";

export default async function LoginPage(props: OryPageParams) {
  const config = enhanceOryConfig(CONFIG.auth.config);
  const flow = await getLoginFlow(props.searchParams);

  if (!flow) {
    return null;
  }

  return (
    <Login
      flow={flow}
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
