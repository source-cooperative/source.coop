import { Layout } from "@/components/Layout";
import { useRouter } from "next/router";
import { Heading, Divider, Box, Text, Input, Alert } from "theme-ui";
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
        active: true,
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

  function disableAccount() {
    const confirmed = confirm(
      "Are you sure you want to disable this account? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    fetch(`/api/v1/accounts/${account_id}`, {
      method: "DELETE",
      credentials: "include",
    }).then((res) => {
      if (!res.ok) {
        res.json().then((data) => {
          setErrorMessage(data.message);
          setSubmitting(false);
        });
      } else {
        setSubmitting(false);
        router.push(`/${account_id}`);
      }
    });
  }

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
          Manage Account
        </Heading>
        <Divider />
        <Box as="form" onSubmit={handleSubmit(onSubmit)} sx={{ maxWidth: 400 }}>
          <Box sx={{ textAlign: "left" }}>
            <Text sx={{ fontFamily: "mono", fontSize: 0 }}>Name</Text>
            <Input {...register("name")} />
            <Text sx={{ fontFamily: "mono", fontSize: 0, color: "red" }}>
              {errors.name?.message}
            </Text>
          </Box>

          <Box sx={{ textAlign: "left" }}>
            <Text sx={{ fontFamily: "mono", fontSize: 0 }}>Bio</Text>
            <Input {...register("bio")} />
            <Text sx={{ fontFamily: "mono", fontSize: 0, color: "red" }}>
              {errors.bio?.message}
            </Text>
          </Box>

          <Box sx={{ textAlign: "left" }}>
            <Text sx={{ fontFamily: "mono", fontSize: 0 }}>Location</Text>
            <Input {...register("location")} />
            <Text sx={{ fontFamily: "mono", fontSize: 0, color: "red" }}>
              {errors.location?.message}
            </Text>
          </Box>

          <Box sx={{ textAlign: "left" }}>
            <Text sx={{ fontFamily: "mono", fontSize: 0 }}>Website</Text>
            <Input {...register("url")} />
            <Text sx={{ fontFamily: "mono", fontSize: 0, color: "red" }}>
              {errors.url?.message}
            </Text>
          </Box>

          <Box sx={{ textAlign: "left", mt: 3 }}>
            <SourceButton disabled={submitting}>
              {submitting ? "Updating..." : "Update"}
            </SourceButton>
          </Box>
        </Box>
        <SourceButton
          sx={{ mt: 3 }}
          variant="error"
          onClick={() => {
            disableAccount();
          }}
          disabled={submitting}
        >
          Disable
        </SourceButton>
      </Layout>
    </>
  );
}
