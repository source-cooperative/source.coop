import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { AxiosError } from "axios";

import { Heading } from "theme-ui";
import { RegistrationFlow, UpdateRegistrationFlowBody } from "@ory/client";
import AuthForm from "@/components/AuthForm";
import { Container, Box } from "theme-ui";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { Dimmer } from "@carbonplan/components"

import ory from "@/pkg/sdk";

export default function Registration() {
  const [registrationDisabled, setRegistrationDisabled] =
    useState<boolean>(false);
  const [flow, setFlow] = useState<RegistrationFlow>();

  // Get ?flow=... from the URL
  const router = useRouter();
  const { return_to: returnTo, flow: flowId, refresh, aal } = router.query;

  // This might be confusing, but we want to show the user an option
  // to sign out if they are performing two-factor authentication!
  //const onLogout = LogoutLink([aal, refresh])

  useEffect(() => {
    // If the router is not ready yet, or we already have a flow, do nothing.
    if (!router.isReady || flow) {
      return;
    }

    // If ?flow=.. was in the URL, we fetch it
    if (flowId) {
      ory.getRegistrationFlow({ id: String(flowId) }).then(({ data }) => {
        setFlow(data);
      });
      return;
    }

    // Otherwise we initialize it
    ory
      .createBrowserRegistrationFlow({
        returnTo: returnTo ? String(returnTo) : undefined,
      })
      .then(({ data }) => {
        setFlow(data);
      })
      .catch((err: AxiosError) => {
        console.log(err);
        // If the previous handler did not catch the error it's most likely a form validation error
        if (err.response?.status === 400) {
          // Yup, it is!
          setRegistrationDisabled(true);
          console.log("Not Authorized!");
          return;
        }

        return Promise.reject(err);
      });
  }, [flowId, router, router.isReady, aal, refresh, returnTo, flow]);

  const onSubmit = async (values: UpdateRegistrationFlowBody) => {
    await router
      // On submission, add the flow ID to the URL but do not navigate. This prevents the user loosing
      // his data when she/he reloads the page.
      .push(`/auth/registration?flow=${flow?.id}`, undefined, {
        shallow: true,
      });

    ory
      .updateRegistrationFlow({
        flow: String(flow?.id),
        updateRegistrationFlowBody: values,
      })
      .then(async ({ data }) => {
        // If we ended up here, it means we are successfully signed up!
        //
        // You can do cool stuff here, like having access to the identity which just signed up:
        console.log("This is the user session: ", data, data.identity);

        // continue_with is a list of actions that the user might need to take before the registration is complete.
        // It could, for example, contain a link to the verification form.
        if (data.continue_with) {
          for (const item of data.continue_with) {
            switch (item.action) {
              case "show_verification_ui":
                // @ts-ignore
                await router.push("/auth/verification?flow=" + item.flow.id);
                return;
            }
          }
        }

        // If continue_with did not contain anything, we can just return to the home page.
        await router.push(flow?.return_to || "/");
      })
      .catch((err: AxiosError) => {
        console.log(err);
        // If the previous handler did not catch the error it's most likely a form validation error
        if (err.response?.status === 400) {
          // Yup, it is!
          setFlow(err.response?.data);
          return;
        }

        return Promise.reject(err);
      });
  };

  return (
    <Container
      sx={{
        width: ["100%", "80%", "50%", "40%"],
        maxWidth: "500px",
        py: 5,
        textAlign: "center",
      }}
    >
      <Box sx={{ alignItems: "center", textAlign: "center" }}>
        <Link href="/">
          <Logo
            sx={{
                  width: "100%",
                  fill: "background",
                  backgroundColor: "primary",
                  p: 3
            }}/>
        </Link>
      </Box>
      <Box mt={3}>
        { flow ? <AuthForm flow={flow} onSubmit={onSubmit} /> : <Heading as="h2">Loading...</Heading>}
      </Box>
      <Box
        sx={{
          display: ["none", "none", "initial", "initial"],
          position: ["fixed"],
          right: [13],
          bottom: [17, 17, 15, 15],
        }}
      >
        <Dimmer />
      </Box>
    </Container>
  );
}
