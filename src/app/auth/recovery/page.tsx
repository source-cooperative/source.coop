import { Recovery } from "@ory/elements-react/theme";
import { enhanceOryConfig } from "@ory/nextjs";
import { getRecoveryFlow, OryPageParams } from "@ory/nextjs/app";
import { DefaultCard } from "@/components/features/auth/DefaultCard";
import { CONFIG } from "@/lib/config";

export default async function RecoveryPage(props: OryPageParams) {
  const config = enhanceOryConfig(CONFIG.auth.config);
  const flow = await getRecoveryFlow(config, props.searchParams);

  if (!flow) {
    return null;
  }

  return (
    <Recovery
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
