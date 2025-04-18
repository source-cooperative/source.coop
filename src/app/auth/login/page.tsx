import { Login } from "@ory/elements-react/theme";
import { enhanceOryConfig } from "@ory/nextjs";
import { getLoginFlow, OryPageParams } from "@ory/nextjs/app";
import { DefaultCard } from "@/components/features/auth/DefaultCard";
import { CONFIG } from "@/lib/config";
import { LightLogo } from "@/components";

export default async function LoginPage(props: OryPageParams) {
  const config = enhanceOryConfig(CONFIG.auth.config);
  const flow = await getLoginFlow(config, props.searchParams);

  if (!flow) {
    return null;
  }

  return (
    <Login
      flow={flow}
      config={config}
      components={{
        Card: {
          Root: DefaultCard,
          Logo: LightLogo,
        },
      }}
    />
  );
}
