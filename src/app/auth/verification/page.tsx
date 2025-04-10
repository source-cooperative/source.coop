import { DefaultCard, Verification } from "@ory/elements-react/theme";
import { enhanceOryConfig } from "@ory/nextjs";
import { getVerificationFlow, OryPageParams } from "@ory/nextjs/app";

import { CONFIG } from "@/lib/config";

export default async function VerificationPage(props: OryPageParams) {
  const config = enhanceOryConfig(CONFIG.auth.config);
  const flow = await getVerificationFlow(config, props.searchParams);

  if (!flow) {
    return null;
  }

  return (
    <Verification
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
