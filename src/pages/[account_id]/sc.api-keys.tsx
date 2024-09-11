import { Layout } from "@/components/Layout";
import { useRouter } from "next/router";
import {
  Heading,
  Divider,
  Box,
  Text,
  Input,
  Alert,
  Checkbox,
  Card,
  Paragraph,
  Button,
  Grid,
  Flex,
} from "theme-ui";
import { getFlags, getProfile } from "@/lib/client/accounts";
import { AccountObject } from "@/components/AccountObject";
import { SideNavLink } from "@/lib/types";

import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AccountProfile,
  AccountProfileSchema,
  APIKeyRequest,
  APIKeyRequestSchema,
  RedactedAPIKey,
} from "@/api/types";
import SourceButton from "@/components/Button";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/api";
import {
  AccountFlags,
  MembershipRole,
  MembershipState,
  AccountType,
} from "@/api/types";
import { z } from "zod";

var flagsObj = {};
for (const key in AccountFlags) {
  flagsObj[key] = z.boolean();
}

export default function TenantDetails() {
  const router = useRouter();
  const { account_id } = router.query;

  const { data: profile, error } = getProfile(account_id as string);
  const { data: accountFlags, error: accountFlagsError } = getFlags(
    account_id as string
  );
  const { user, isLoading, isError } = useUser();

  var baseSideNavLinks: SideNavLink[] = [
    {
      href: `/${account_id}`,
      title: "Repositories",
      active: false,
    },
  ];

  const [sideNavLinks, setSideNavLinks] =
    useState<SideNavLink[]>(baseSideNavLinks);

  useEffect(() => {
    if (!account_id) {
      return;
    }

    if (!user) {
      return;
    }

    var newSideNav = [...baseSideNavLinks];
    var editPermissions = false;
    var adminPermissions = false;

    if (account_id === user?.account?.account_id) {
      newSideNav.push({
        href: `/${account_id}/sc.invitations`,
        title: "Invitations",
        active: false,
      });
    }

    if (profile?.account_type === AccountType.ORGANIZATION) {
      newSideNav.push({
        href: `/${account_id}/sc.members`,
        title: "Members",
        active: false,
      });
    }

    if (user?.account?.flags.includes(AccountFlags.ADMIN)) {
      editPermissions = true;
      adminPermissions = true;
    }

    if (user?.account?.account_id === account_id) {
      editPermissions = true;
    }

    for (const membership of user?.memberships) {
      if (
        membership.membership_account_id === account_id &&
        membership.state === MembershipState.Member &&
        (membership.role === MembershipRole.Owners ||
          membership.role === MembershipRole.Maintainers)
      ) {
        editPermissions = true;
      }
    }

    if (editPermissions) {
      newSideNav.push({
        href: `/${account_id}/sc.manage`,
        title: "Manage",
        active: false,
      });

      newSideNav.push({
        href: `/${account_id}/sc.api-keys`,
        title: "API Keys",
        active: true,
      });

      if (accountFlags?.includes(AccountFlags.CREATE_REPOSITORIES)) {
        newSideNav.push({
          href: `/${account_id}/sc.new-repository`,
          title: "New Repository",
          active: false,
        });
      }
    }

    if (adminPermissions) {
      newSideNav.push({
        href: `/${account_id}/sc.flags`,
        title: "Edit Flags",
        active: false,
      });
    }
    setSideNavLinks(newSideNav);
  }, [account_id, user, profile, accountFlags]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [createdKey, setCreatedKey] = useState(null);

  const [apiKeys, setAPIKeys] = useState([]);

  async function fetchAPIKeys() {
    const res = await fetch(`/api/v1/accounts/${account_id}/api-keys`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMessage(data.message);
      return null;
    } else {
      return data;
    }
  }

  useEffect(() => {
    if (!account_id) {
      return;
    }
    fetchAPIKeys().then((keys) => setAPIKeys(keys));
  }, [account_id]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<APIKeyRequest>({
    resolver: zodResolver(APIKeyRequestSchema),
    defaultValues: {
      expires:
        new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split(".")[0] + "Z",
    },
  });

  const onSubmit: SubmitHandler<APIKeyRequest> = (data) => {
    setSubmitting(true);
    setErrorMessage(null);
    fetch(`/api/v1/accounts/${account_id}/api-keys`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then((res) => {
      if (!res.ok) {
        setSubmitting(false);
        res.json().then((data) => {
          setErrorMessage(data.message);
        });
      } else {
        res.json().then((data) => {
          fetchAPIKeys().then((keys) => {
            setCreatedKey(data);
            setAPIKeys(keys);
            setSubmitting(false);
          });
        });
      }
    });
  };

  function revokeAPIKey(access_key_id: string) {
    setSubmitting(true);
    setErrorMessage(null);
    fetch(`/api/v1/api-keys/${access_key_id}`, {
      method: "DELETE",
      credentials: "include",
    }).then((res) => {
      if (!res.ok) {
        setSubmitting(false);
        res.json().then((data) => {
          setErrorMessage(data.message);
        });
      } else {
        fetchAPIKeys().then((keys) => {
          setAPIKeys(keys);
          setSubmitting(false);
        });
      }
    });
  }

  function containsMoreThanCreatedKey(apiKeys, createdKey) {
    if (!apiKeys || apiKeys.length === 0) {
      return false;
    }

    for (const apiKey of apiKeys) {
      if (createdKey) {
        if (apiKey.access_key_id !== createdKey.access_key_id) {
          return true;
        }
      } else {
        return true;
      }
    }
    return false;
  }

  function APIKeyCard({ apiKey, i, revokable }) {
    return (
      <Card
        key={`api-key-${i}`}
        variant="code"
        sx={{ width: ["100%", "fit-content", "fit-content", "fit-content"] }}
      >
        <Paragraph sx={{ fontFamily: "mono", fontSize: 0, my: 0 }}>
          Name: {apiKey.name}
        </Paragraph>
        <Paragraph sx={{ fontFamily: "mono", fontSize: 0, my: 0 }}>
          Access Key ID: {apiKey.access_key_id}
        </Paragraph>
        <Paragraph sx={{ fontFamily: "mono", fontSize: 0, my: 0 }}>
          Secret Access Key:{" "}
          {createdKey?.access_key_id === apiKey.access_key_id
            ? createdKey.secret_access_key
            : "<REDACTED>"}
        </Paragraph>
        <Paragraph sx={{ fontFamily: "mono", fontSize: 0, my: 0 }}>
          Expires: {apiKey.expires}
        </Paragraph>
        {revokable ? (
          <Box sx={{ textAlign: "right" }}>
            <Button
              variant="error"
              sx={{ mt: 2 }}
              disabled={submitting}
              onClick={(e) => {
                revokeAPIKey(apiKey.access_key_id);
              }}
            >
              Revoke
            </Button>
          </Box>
        ) : (
          <></>
        )}
      </Card>
    );
  }

  return (
    <>
      <Layout notFound={false} sideNavLinks={sideNavLinks}>
        {errorMessage ? (
          <Alert variant={"error"} sx={{ my: 2 }}>
            {errorMessage}
          </Alert>
        ) : (
          <></>
        )}
        <AccountObject profile={profile} account_id={account_id as string} />
        <Heading sx={{ mb: 2 }} as="h1">
          Manage API Keys
        </Heading>
        <Divider />
        <Heading>New API Key</Heading>
        {createdKey ? (
          <Box sx={{ mb: 3 }}>
            <APIKeyCard apiKey={createdKey} i={0} revokable={false} />
          </Box>
        ) : (
          <></>
        )}
        <Card
          variant="code"
          sx={{ width: "fit-content", mb: 3 }}
          as="form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Paragraph sx={{ fontFamily: "mono", fontSize: 0, my: 0 }}>
            Name: <Input {...register("name")} />
            <Text sx={{ fontFamily: "mono", fontSize: 0, color: "red" }}>
              {errors.name?.message}
            </Text>
          </Paragraph>
          <Paragraph sx={{ fontFamily: "mono", fontSize: 0, mt: 2 }}>
            Expires: <Input {...register("expires")} />
            <Text sx={{ fontFamily: "mono", fontSize: 0, color: "red" }}>
              {errors.expires?.message}
            </Text>
          </Paragraph>
          <Box sx={{ textAlign: "right" }}>
            <Button variant="success" sx={{ mt: 2 }}>
              Create
            </Button>
          </Box>
        </Card>
        {containsMoreThanCreatedKey(apiKeys, createdKey) ? (
          <>
            <Heading>API Keys</Heading>
            <Flex sx={{ gap: 3, flexWrap: "wrap" }}>
              {apiKeys?.map((key, i) => {
                if (key.access_key_id === createdKey?.access_key_id) {
                  return <></>;
                } else {
                  return APIKeyCard({ apiKey: key, i, revokable: true });
                }
              })}
            </Flex>
          </>
        ) : (
          <></>
        )}
      </Layout>
    </>
  );
}
