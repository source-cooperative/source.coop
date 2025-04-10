import { Registration } from "@ory/elements-react/theme";
import { enhanceOryConfig } from "@ory/nextjs";
import { getRegistrationFlow, OryPageParams } from "@ory/nextjs/app";

import { CONFIG } from "@/lib/config";
import { DefaultCard } from "@/components/features/auth/DefaultCard";

export default async function RegistrationPage(props: OryPageParams) {
  const config = enhanceOryConfig(CONFIG.auth.config);
  const flow = await getRegistrationFlow(config, props.searchParams);

  if (!flow) {
    return null;
  }

  return (
    <Registration
      flow={flow}
      config={config}
      components={{
        Card: {
          Root: DefaultCard,
        },
      }}
    />
  );
}
