import {
  Box,
  Container,
  Grid,
  Heading,
  Paragraph,
  Input,
  Select,
  Text,
  Alert,
} from "theme-ui";
import SourceButton from "@/components/Button";
import { useRouter } from "next/router";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Dimmer } from "@carbonplan/components";
import { Logo } from "@/components/Logo";
import { Configuration, FrontendApi } from "@ory/client";
import { useState, useEffect } from "react";
import {
  AccountCreationRequest,
  AccountCreationRequestSchema,
  AccountType,
} from "@/api/types";
import useSWR from "swr";
import { UserSession } from "@/api/types";
import { ClientError } from "@/lib/client/accounts";

import { COUNTRIES } from "@/lib/constants";
import { edgeConfig } from "@ory/integrations/next";

const baseUrl: string = process.env.NEXT_PUBLIC_IS_PROD
  ? process.env.NEXT_PUBLIC_ORY_SDK_URL
  : "http://localhost:3000/api/.ory";

let ory: FrontendApi;
if (process.env.NEXT_PUBLIC_IS_PROD) {
  ory = new FrontendApi(
    new Configuration({
      basePath: baseUrl,
      accessToken: process.env.ORY_ACCESS_TOKEN,
      baseOptions: {
        withCredentials: true, // Important for CORS
        timeout: 30000, // 30 seconds
      },
    })
  );
} else {
  ory = new FrontendApi(new Configuration(edgeConfig));
}

export async function createAccount(
  accountCreationRequest: AccountCreationRequest
): Promise<null> {
  return null;
}

export default function AccountForm() {
  const [errorMessage, setErrorMessage] = useState(null);
  const [logoutUrl, setLogoutUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const { data: user, mutate: refreshUser } = useSWR<UserSession, ClientError>(
    { path: `/api/v1/whoami` },
    {
      refreshInterval: 0,
    }
  );

  if (user && user.account) {
    router.push(`/${user.account.account_id}`);
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountCreationRequest>({
    resolver: zodResolver(AccountCreationRequestSchema),
    defaultValues: {
      account_type: AccountType.USER,
    },
  });

  const onSubmit: SubmitHandler<AccountCreationRequest> = (data) => {
    setSubmitting(true);
    fetch(`/api/v1/accounts`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then((res) => {
      if (res.ok) {
        refreshUser().then(() => {
          router.push(`/${data.account_id}`);
        });
      } else {
        res.json().then((data) => {
          setErrorMessage(data.message);
        });
        setSubmitting(false);
      }
    });
  };

  useEffect(() => {
    ory.createBrowserLogoutFlow().then((res) => {
      setLogoutUrl(res.data.logout_url);
    });
  }, []);

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
              p: 3,
            }}
          />
        </Link>
      </Box>
      {errorMessage ? <Alert variant={"error"}>{errorMessage}</Alert> : <></>}
      <Box as="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid
          sx={{
            gridTemplateColumns: [],
          }}
        >
          <Heading as="h1" sx={{ mb: 0 }}>
            Welcome!
          </Heading>
          <Paragraph sx={{ mt: 0 }}>
            Before you get started, we need to complete your account
            registration. This will only take a minute.
          </Paragraph>

          <Heading as="h2" sx={{ mb: 0 }}>
            Choose a Username
          </Heading>

          <Box sx={{ textAlign: "left" }}>
            <Text sx={{ fontFamily: "mono", fontSize: 0 }}>Username</Text>
            <Input {...register("account_id")} />
            <Text sx={{ fontFamily: "mono", fontSize: 0, color: "red" }}>
              {errors.account_id?.message}
            </Text>
          </Box>
          <Box sx={{ textAlign: "left" }}>
            <Paragraph sx={{ my: 0, fontFamily: "mono", fontSize: 0 }}>
              Usernames must meet the following criteria:
            </Paragraph>
            <Paragraph sx={{ my: 0, fontFamily: "mono", fontSize: 0 }}>
              • Between 3 and 40 characters in length
            </Paragraph>
            <Paragraph sx={{ my: 0, fontFamily: "mono", fontSize: 0 }}>
              • Contain only letters, numbers, and hyphens
            </Paragraph>
            <Paragraph sx={{ my: 0, fontFamily: "mono", fontSize: 0 }}>
              • Must not start or end with a hyphen
            </Paragraph>
            <Paragraph sx={{ my: 0, fontFamily: "mono", fontSize: 0 }}>
              • Must not contain consecutive hyphens
            </Paragraph>
          </Box>

          <Heading as="h2" sx={{ mb: 0 }}>
            Fill out Your Profile
          </Heading>
          <Paragraph sx={{ mt: 0 }}>
            You can fill out your profile information later if you'd like.
          </Paragraph>

          <Box sx={{ textAlign: "left" }}>
            <Text sx={{ fontFamily: "mono", fontSize: 0 }}>Name</Text>
            <Input {...register("profile.name")} />
            <Text sx={{ fontFamily: "mono", fontSize: 0, color: "red" }}>
              {errors.profile?.name?.message}
            </Text>
          </Box>

          <Box sx={{ textAlign: "left" }}>
            <Text sx={{ fontFamily: "mono", fontSize: 0 }}>Bio</Text>
            <Input {...register("profile.bio")} />
            <Text sx={{ fontFamily: "mono", fontSize: 0, color: "red" }}>
              {errors.profile?.bio?.message}
            </Text>
          </Box>

          <Box sx={{ textAlign: "left" }}>
            <Text sx={{ fontFamily: "mono", fontSize: 0 }}>Location</Text>
            <Select {...register("profile.location")}>
              {COUNTRIES.map((country, i) => (
                <option key={`country-${i}`}>{country.value}</option>
              ))}
            </Select>
            <Text sx={{ fontFamily: "mono", fontSize: 0, color: "red" }}>
              {errors.profile?.location?.message}
            </Text>
          </Box>

          <Box sx={{ textAlign: "left" }}>
            <Text sx={{ fontFamily: "mono", fontSize: 0 }}>Website</Text>
            <Input {...register("profile.url")} />
            <Text sx={{ fontFamily: "mono", fontSize: 0, color: "red" }}>
              {errors.profile?.url?.message}
            </Text>
          </Box>

          <Box sx={{ textAlign: "center" }}>
            <SourceButton disabled={submitting}>
              {submitting ? "Submitting..." : "Complete Registration"}
            </SourceButton>
          </Box>
        </Grid>
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
