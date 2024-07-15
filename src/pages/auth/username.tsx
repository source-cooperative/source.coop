import { Layout } from "@/components/Layout";
import { Box, Input, Label, Container, Heading, Text, Alert, Paragraph } from "theme-ui";
import SourceButton from "@/components/Button";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ory from "@/pkg/sdk";

import { claimUsername } from "@/lib/api";
import Link from "next/link";

import { Dimmer } from "@carbonplan/components";
import { Logo } from "@/components/Logo";
import { FormInput } from "@/components/Form";

export default function Account() {
  const [usernameCandidate, setUsernameCandidate] = useState(null);
  const [validation, setValidation] = useState(null);
  const [claimStatus, setClaimStatus] = useState(null);
  const [validationMessage, setValidationMessage] = useState(null);
  const router = useRouter();

  const claim = async (e) => {
    console.log(e)
    e.preventDefault();
    if (!validation || !validation.status || validation.status != "valid") {
      return;
    }

    setClaimStatus({
      status: "claiming"
    });

    ory
      .toSession()
      .then(({ data }) => {
        fetch(process.env.NEXT_PUBLIC_API_BASE + "/accounts/", {credentials: "include", headers: {"Content-Type": "application/json"}, method: "POST", body: JSON.stringify({
          "account": {
            "account_id": validation.account_id,
            "account_type": "user",
            "identity_id": data.identity.id
          }
        })}).then((res) => {
          if (!res.ok) {
            if (res.status == 400 || res.status == 401) {
              res.json().then((validation) => {
                setClaimStatus({
                  status: "failed",
                  error: validation.detail
                })
              })
            } else {
              setClaimStatus({
                status: "failed",
                error: "There was an error claiming your username, please try again"
              })
            }
          } else {
            fetch(process.env.NEXT_PUBLIC_API_BASE + "/auth/whoami", {credentials: "include"}).then((res) => {
              if (res.ok) {
                res.json().then((profile) => {
                  localStorage.setItem("profile", JSON.stringify(profile))
                    router.push("/account/profile");
                })
              }
            })
          }
        })
      })
      .catch(() => {
        setClaimStatus({
          status: "failed",
          error: "You must be signed in to perform this action"
        })
      });

    
  }


  useEffect(() => {
    setValidation(null);
    if (!usernameCandidate) {
      return;
    }

    const timer = setTimeout(() => {
      setValidationMessage({
        type: "warning",
        text: "Checking username availability..."
      })
      setValidation({
        status: "checking",
        content: <Box><Text sx={{color: "orange"}}>Checking for username availability...</Text></Box>
      })

      fetch(process.env.NEXT_PUBLIC_API_BASE + "/accounts/" + usernameCandidate + "/valid?account_type=user").then((res) => {
        if (res.ok) {
          res.json().then((validation) => {
            setValidationMessage({
              type: "success",
              text: validation.detail
            })
            setValidation({
              status: "valid",
              content: <Box><Text sx={{color: "green"}}>{validation.detail}</Text></Box>,
              account_id: validation.account_id
            })
          })
        } else if (res.status == 400) {
          res.json().then((validation) => {
            setValidationMessage({
              type: "error",
              text: validation.detail
            })
            setValidation({
              status: "invalid",
              content: <Box><Text sx={{color: "red"}}>{validation.detail}</Text></Box>
            })
          })
        } else {
          setValidationMessage({
            type: "error",
            text: "Whoops! There was an error checking for username availability. Try again soon."
          })
          setValidation({
            status: "error",
            content: <Box><Text sx={{color: "red"}}>Whoops! There was an error checking for username availability. Try again soon.</Text></Box>
          })
        }
  
      })
    }, 250)

    return () => clearTimeout(timer);
  }, [usernameCandidate])

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
          <Box sx={{display: "block", textAlign: "center", justifyContent: "center", mb: 3, fontFamily: "mono"}}>
            <Heading as="h1" sx={{fontFamily: "mono", lineHeight: "0.9em"}}>Welcome!</Heading>
            <Box sx={{display: "flex", justifyContent: "center"}}>
              <Paragraph sx={{fontFamily: "mono"}}>What should we call you?</Paragraph>
            </Box>
          </Box>

          <Box as="form" onSubmit={claim} sx={{position: "relative"}}>
            <FormInput name="username" label="Username" message={validationMessage} required={true} onChange={(e) => {setUsernameCandidate(e.target.value)}} />
            <Box sx={{mt: 4}}>
              <SourceButton disabled={!validation || validation.status != "valid"}>
                {
                  claimStatus && claimStatus.status == "claiming" ? "Claiming Username..." : "Claim Username"
                }
              </SourceButton>
            </Box>
          </Box>
       
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