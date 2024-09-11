import { Layout } from "@/components/Layout";
import { useRouter } from "next/router";
import { Heading, Divider, Box, Text, Input, Alert, Checkbox } from "theme-ui";
import { getFlags, getProfile } from "@/lib/client/accounts";
import { AccountObject } from "@/components/AccountObject";
import { SideNavLink } from "@/lib/types";

import { useForm, SubmitHandler, Controller } from "react-hook-form";
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
        active: true,
      });
    }
    setSideNavLinks(newSideNav);
  }, [account_id, user, profile, accountFlags]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const FlagsSchema = z.object({
    admin: z.boolean(),
    create_organizations: z.boolean(),
    create_repositories: z.boolean(),
  });

  type Flags = z.infer<typeof FlagsSchema>;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<Flags>({
    resolver: zodResolver(FlagsSchema),
    defaultValues: {},
  });

  useEffect(() => {
    var newFlags = {};
    if (accountFlags) {
      for (const key of Object.values(AccountFlags)) {
        if (accountFlags.includes(key)) {
          newFlags[key] = true;
        } else {
          newFlags[key] = false;
        }
      }
      console.log(newFlags);
      reset(newFlags);
    }
  }, [accountFlags]);

  const onSubmit: SubmitHandler<Flags> = (data) => {
    setSubmitting(true);
    var userFlags = [];
    for (const [key, value] of Object.entries(data)) {
      if (value === true) {
        userFlags.push(key);
      }
    }
    fetch(`/api/v1/accounts/${account_id}/flags`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userFlags),
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
          Manage User Flags
        </Heading>
        <Divider />
        <Box as="form" onSubmit={handleSubmit(onSubmit)} sx={{ maxWidth: 400 }}>
          <Box sx={{ textAlign: "left" }}>
            <Text sx={{ fontFamily: "mono", fontSize: 0 }}>Admin</Text>
            <input type="checkbox" {...register(AccountFlags.ADMIN)} />
          </Box>
          <Box sx={{ textAlign: "left" }}>
            <Text sx={{ fontFamily: "mono", fontSize: 0 }}>
              Create Organizations
            </Text>
            <input
              type="checkbox"
              {...register(AccountFlags.CREATE_ORGANIZATIONS)}
            />
          </Box>
          <Box sx={{ textAlign: "left" }}>
            <Text sx={{ fontFamily: "mono", fontSize: 0 }}>
              Create Repositories
            </Text>
            <input
              type="checkbox"
              {...register(AccountFlags.CREATE_REPOSITORIES)}
            />
          </Box>

          <Box sx={{ textAlign: "left", mt: 3 }}>
            <SourceButton disabled={submitting}>
              {submitting ? "Updating..." : "Update"}
            </SourceButton>
          </Box>
        </Box>
      </Layout>
    </>
  );
}
