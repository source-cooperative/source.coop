import { Layout } from "@/components/Layout";
import { useRouter } from "next/router";
import {
  Heading,
  Divider,
  Box,
  Text,
  Input,
  Alert,
  Flex,
  Button,
  Card,
} from "theme-ui";
import { getProfile, getFlags } from "@/lib/client/accounts";
import { AccountObject } from "@/components/AccountObject";
import { SideNavLink } from "@/lib/types";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AccountProfile, AccountProfileSchema } from "@/api/types";
import SourceButton from "@/components/Button";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/api";
import {
  AccountFlags,
  MembershipRole,
  MembershipState,
  AccountType,
} from "@/api/types";
import SourceLink from "@/components/SourceLink";

function acceptMembership(membership) {
  fetch(`/api/v1/memberships/${membership.membership_id}/accept`, {
    method: "POST",
    credentials: "include",
  }).then((res) => {
    if (res.ok) {
      console.log("Accepted");
    } else {
      console.error("Failed to accept membership");
    }
  });
}

function declineMembership(membership) {
  fetch(`/api/v1/memberships/${membership.membership_id}/revoke`, {
    method: "POST",
    credentials: "include",
  }).then((res) => {
    if (res.ok) {
      console.log("Declined");
    } else {
      console.error("Failed to decline membership");
    }
  });
}

function Invitation(membership, i) {
  if (membership.state !== MembershipState.Invited) {
    return <></>;
  }
  return (
    <Card variant="code" key={`invite-${i}`} sx={{ width: "fit-content" }}>
      <Text>
        Invited to{" "}
        <SourceLink href={`/${membership.membership_account_id}`}>
          @{membership.membership_account_id}
        </SourceLink>{" "}
        on{" "}
        {new Date(membership.state_changed).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </Text>
      <Box sx={{ mt: 2 }}>
        <Button
          variant="success"
          sx={{ mr: 2, fontSize: 0 }}
          onClick={(e) => {
            acceptMembership(membership);
          }}
        >
          Accept
        </Button>
        <Button
          variant="error"
          sx={{ fontSize: 0 }}
          onClick={(e) => {
            declineMembership(membership);
          }}
        >
          Decline
        </Button>
      </Box>
    </Card>
  );
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
        active: true,
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
        active: false,
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountProfile>({
    resolver: zodResolver(AccountProfileSchema),
    defaultValues: profile,
  });

  useEffect(() => {
    reset(profile);
  }, [profile]);

  const onSubmit: SubmitHandler<AccountProfile> = (data) => {
    setSubmitting(true);
    fetch(`/api/v1/accounts/${account_id}/profile`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then((res) => {
      setSubmitting(false);
      if (!res.ok) {
        res.json().then((data) => {
          setErrorMessage(data.message);
        });
      }
    });
  };

  return (
    <>
      <Layout
        notFound={error && error.status === 404}
        sideNavLinks={sideNavLinks}
      >
        {errorMessage ? (
          <Alert variant={"error"} sx={{ my: 2 }}>
            {errorMessage}
          </Alert>
        ) : (
          <></>
        )}
        <AccountObject profile={profile} account_id={account_id as string} />
        <Heading sx={{ mb: 2 }} as="h1">
          Invitations
        </Heading>
        <Divider />
        <Flex sx={{ gap: 3 }}>
          {user?.memberships?.map((membership, i) => {
            return Invitation(membership, i);
          })}
        </Flex>
      </Layout>
    </>
  );
}
