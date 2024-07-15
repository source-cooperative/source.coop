import { Layout } from "@/components/Layout";
import { Text, Card, Heading, Grid, Container, Spinner } from "theme-ui";
import { SettingsFlow, UpdateSettingsFlowBody } from "@ory/client";
import ory from "@/pkg/sdk";
import { AxiosError } from "axios";
import { handleFlowError } from "@/pkg/errors";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";
import { Tabs } from "@/lib/tabs/account";
import AuthForm from "@/components/AuthForm";

export default function Account() {
  const [flow, setFlow] = useState<SettingsFlow>();
  const [flowLoading, setFlowLoading] = useState<boolean>(false);

  // Get ?flow=... from the URL
  const router = useRouter();
  const { flow: flowId, return_to: returnTo } = router.query;

  useEffect(() => {
    // If the router is not ready yet, or we already have a flow, do nothing.
    if (!router.isReady || flow) {
      return;
    }

    // If ?flow=.. was in the URL, we fetch it
    if (flowId) {
      ory
        .getSettingsFlow({ id: String(flowId) })
        .then(({ data }) => {
          setFlow(data);
        })
        .catch(handleFlowError(router, "settings", setFlow));
      return;
    }

    // Otherwise we initialize it
    ory
      .createBrowserSettingsFlow({
        returnTo: returnTo ? String(returnTo) : undefined,
      })
      .then(({ data }) => {
        console.log(data);
        setFlow(data);
        console.log(flow)
      })
      .catch(handleFlowError(router, "settings", setFlow));
  }, [flowId, router, router.isReady, returnTo, flow]);

  const onSubmit = (values: UpdateSettingsFlowBody) => {
    setFlowLoading(true);
    return (
      router
        // On submission, add the flow ID to the URL but do not navigate. This prevents the user loosing
        // his data when she/he reloads the page.
        .push(`/account/password?flow=${flow?.id}`, undefined, {
          shallow: true,
        })
        .then(() =>
          ory
            .updateSettingsFlow({
              flow: String(flow?.id),
              updateSettingsFlowBody: values,
            })
            .then(({ data }) => {
              // The settings have been saved and the flow was updated. Let's show it to the user
              setFlow(data);
              setFlowLoading(false);
            })
            .catch(handleFlowError(router, "settings", setFlow))
            .catch(async (err: AxiosError) => {
              setFlowLoading(false);
              // If the previous handler did not catch the error it's most likely a form validation error
              if (err.response?.status === 400) {
                // Yup, it is!
                setFlow(err.response?.data);
                return;
              }

              return Promise.reject(err);
            })
        )
    );
  };
  return (
    <>
      <Layout sideNavLinks={[{type: "link", href: "/account/profile", title: "Profile"}, {type: "link", active: true, href: "/account/password", title: "Change Password"}]}>
        { flow ? <><Heading as="h2">Change Password</Heading><AuthForm 
          flow={flow} 
          onSubmit={onSubmit} 
          group={"password"}
          disabled={flowLoading}
          gridColumnsTemplate={["50%", "50%", "50%", "50%"]}
          gridColumns={
            {
              "password": {"start": 1, "end": "end"}, 
              "method": {"start": 1, "end": ["end", 1, 1, 1]}
            }
          }/></> : <Heading as="h2">Loading...</Heading>}
      </Layout>
    </>
  );
}
