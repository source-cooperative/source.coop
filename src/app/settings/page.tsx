import { Settings } from "@ory/elements-react/theme";
import { enhanceOryConfig } from "@ory/nextjs";
import { getSettingsFlow, OryPageParams } from "@ory/nextjs/app";
import "@ory/elements-react/theme/styles.css";
import { ReactNode } from "react";
import type { SettingsFlow } from "@ory/client-fetch";

import { CONFIG } from "@/lib/config";
import { SessionProvider } from "@/components/providers/SessionProvider";

export default async function SettingsPage(props: OryPageParams) {
  const config = enhanceOryConfig(CONFIG.auth.config);
  const flow = await getSettingsFlow(props.searchParams);

  if (!flow) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8 items-center mb-8">
      <SessionProvider>
        <Settings
          flow={flow as unknown as SettingsFlow}
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
              // Card: ({ children }: { children?: ReactNode }) => (
              //   <div className="w-full max-w-md">{children}</div>
              // ),
            }
          }
        />
      </SessionProvider>
    </div>
  );
}
