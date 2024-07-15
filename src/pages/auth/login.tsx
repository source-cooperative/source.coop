import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { AxiosError } from "axios";
import { NextRouter } from "next/router";
import { Dispatch, SetStateAction } from "react";

import { LoginFlow, UpdateLoginFlowBody } from "@ory/client";
import ory from "@/pkg/sdk";
import { Dimmer } from "@carbonplan/components";
import { Logo } from "@/components/Logo";

import { toast } from "react-toastify";


import { Box, Grid, Container, Heading, Text, Alert, Divider } from "theme-ui";
import { FormInput } from "@/components/Form";
import SourceButton from "@/components/Button";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";


function handleGetFlowError<S>(
  router: NextRouter,
  flowType: "login" | "registration" | "settings" | "recovery" | "verification",
  resetFlow: Dispatch<SetStateAction<S | undefined>>
) {
  return async (err: AxiosError) => {
    switch (err.response?.data.error?.id) {
      case "session_aal2_required":
        // 2FA is enabled and enforced, but user did not perform 2fa yet!
        window.location.href = err.response?.data.redirect_browser_to;
        return;
      case "session_already_available":
        // User is already signed in, let's redirect them home!
        await router.push("/");
        return;
      case "session_refresh_required":
        // We need to re-authenticate to perform this action
        window.location.href = err.response?.data.redirect_browser_to;
        return;
      case "self_service_flow_return_to_forbidden":
        // The flow expired, let's request a new one.
        toast.error("The return_to address is not allowed.");
        resetFlow(undefined);
        await router.push("/auth/" + flowType);
        return;
      case "self_service_flow_expired":
        // The flow expired, let's request a new one.
        toast.error(
          "Your interaction expired, please fill out the form again."
        );
        resetFlow(undefined);
        await router.push("/auth/" + flowType);
        return;
      case "security_csrf_violation":
        // A CSRF violation occurred. Best to just refresh the flow!
        toast.error(
          "A security violation was detected, please fill out the form again."
        );
        resetFlow(undefined);
        await router.push("/auth/" + flowType);
        return;
      case "security_identity_mismatch":
        // The requested item was intended for someone else. Let's request a new flow...
        resetFlow(undefined);
        await router.push("/auth/" + flowType);
        return;
      case "browser_location_change_required":
        // Ory Kratos asked us to point the user to this URL.
        window.location.href = err.response.data.redirect_browser_to;
        return;
    }

    switch (err.response?.status) {
      case 410:
        // The flow expired, let's request a new one.
        resetFlow(undefined);
        await router.push("/" + flowType);
        return;
    }

    // We are not able to handle the error? Return it.
    return Promise.reject(err);
  };
}


export default function Login() {
  const [flow, setFlow] = useState<LoginFlow>();
  const [flowLoading, setFlowLoading] = useState<boolean>();

  // Get ?flow=... from the URL
  const router = useRouter();
  const {
    return_to: returnTo,
    flow: flowId,
    // Refresh means we want to refresh the session. This is needed, for example, when we want to update the password
    // of a user.
    refresh,
    // AAL = Authorization Assurance Level. This implies that we want to upgrade the AAL, meaning that we want
    // to perform two-factor authentication/verification.
    aal,
  } = router.query;

  // This might be confusing, but we want to show the user an option
  // to sign out if they are performing two-factor authentication!
  //const onLogout = LogoutLink([aal, refresh])

  const onSubmit = (values) =>
    {
    setFlowLoading(true);
    router
      // On submission, add the flow ID to the URL but do not navigate. This prevents the user loosing
      // his data when she/he reloads the page.
      .push(`/auth/login?flow=${flow?.id}`, undefined, { shallow: true })
      .then(() =>
        ory
          .updateLoginFlow({
            flow: String(flow?.id),
            updateLoginFlowBody: values,
          })
          // We logged in successfully! Let's bring the user home.
          .then(() => {
            fetch(process.env.NEXT_PUBLIC_API_BASE + "/auth/whoami", {credentials: "include"}).then((res) => {
              if (res.ok) {
                res.json().then((profile) => {
                    setFlowLoading(false);
                    localStorage.setItem("profile", JSON.stringify(profile))
                    if (flow?.return_to) {
                      window.location.href = flow?.return_to;
                      return;
                    }
                    router.push("/");
                })
              }
            })
            
            
          })
          .then(() => {})
          .catch(handleGetFlowError(router, "login", setFlow))
          .catch((err: AxiosError) => {
            // If the previous handler did not catch the error it's most likely a form validation error
            if (err.response?.status === 400) {
              // Yup, it is!
              setFlowLoading(false);
              console.log(err);
              setFlow(err.response?.data)
              return;
            }

            return Promise.reject(err);
          })
        
      )};

  useEffect(() => {
    // If the router is not ready yet, or we already have a flow, do nothing.
    if (!router.isReady || flow) {
      return;
    }

    // If ?flow=.. was in the URL, we fetch it
    if (flowId) {
      ory
        .getLoginFlow({ id: String(flowId) })
        .then(({ data }) => {
          setFlow(data);
        })
        .catch(handleGetFlowError(router, "login", setFlow));
      return;
    }

    // Otherwise we initialize it
    ory
      .createBrowserLoginFlow({
        refresh: Boolean(refresh),
        aal: aal ? String(aal) : undefined,
        returnTo: returnTo ? String(returnTo) : undefined,
      })
      .then(({ data }) => {
        setFlow(data);
      })
      .catch(handleGetFlowError(router, "login", setFlow));
  }, [flowId, router, router.isReady, aal, refresh, returnTo, flow]);

  

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
        { flow ? <AuthForm flow={flow} onSubmit={onSubmit} gridColumnsTemplate={"1fr 1fr"}
          disabled={flowLoading}>
            <SourceButton
                  sx={{gridColumnStart: 1, gridColumnEnd: 2}}
                  href="/auth/registration"
                >
                    Create Account
                </SourceButton>
            <SourceButton
              sx={{gridColumnStart: 2, gridColumnEnd: "end"}}
              href="/auth/recovery"
            >
                Recover Account
            </SourceButton>
          </AuthForm> : <Heading as="h2">Loading...</Heading>}
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
