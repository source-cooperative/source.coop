import { Layout } from "@/components/Layout";
import { useRouter } from "next/router";
import {
  Heading,
  Divider,
  Box,
  Text,
  Flex,
  Alert,
  Card,
  Paragraph,
  Input,
  Select,
  Button,
} from "theme-ui";
import { getProfile, getFlags } from "@/lib/client/accounts";
import { AccountObject } from "@/components/AccountObject";
import { SideNavLink } from "@/lib/types";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MembershipInvitation, MembershipInvitationSchema } from "@/api/types";
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

async function fetchMembers(account_id) {
  if (!account_id) {
    return;
  }
  const res = await fetch(`/api/v1/accounts/${account_id}/members`, {
    method: "GET",
    credentials: "include",
  });
  if (res.ok) {
    const data = await res.json();
    return data;
  }
  return [];
}

function revokeMembership(member, setMembers, account_id) {
  const confirmed = confirm(
    "Are you sure you want to revoke this account's membership?"
  );

  if (!confirmed) {
    return;
  }

  fetch(`/api/v1/memberships/${member.membership_id}/revoke`, {
    method: "POST",
    credentials: "include",
  }).then((res) => {
    if (res.ok) {
      fetchMembers(account_id).then((members) => {
        setMembers(members);
      });
    } else {
      console.error("Failed to revoke membership");
    }
  });
}

function updateMembership(member, new_role) {
  fetch(`/api/v1/memberships/${member.membership_id}/update-role`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(new_role),
  }).then((res) => {
    if (res.ok) {
      console.log("Updated");
    } else {
      console.error("Failed to update membership");
    }
  });
}

function MemberCard({ member, editable, i, setMembers, account_id }) {
  if (!editable) {
    if (member.state === MembershipState.Member) {
      return <></>;
    }
    return (
      <Card variant="code" key={i} sx={{ my: 2 }}>
        <Box>
          <SourceLink href={`/${member.account_id}`}>
            @{member.account_id}
          </SourceLink>
          <Text sx={{ textTransform: "capitalize" }}> | {member.role}</Text>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Text>
            Member Since{" "}
            {new Date(member.state_changed).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </Box>
      </Card>
    );
  }
  let dateString;
  if (member.state === MembershipState.Member) {
    dateString =
      "Member Since " +
      new Date(member.state_changed).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  } else if (member.state === MembershipState.Invited) {
    dateString =
      "Invited on " +
      new Date(member.state_changed).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  } else if (member.state === MembershipState.Revoked) {
    dateString =
      "Revoked on " +
      new Date(member.state_changed).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  }

  return (
    <Card variant="code" key={i} sx={{ my: 2 }}>
      <Box>
        <SourceLink href={`/${member.account_id}`}>
          @{member.account_id}
        </SourceLink>
        <Box sx={{ mt: 2 }}>
          <Text>{dateString}</Text>
        </Box>
        {member.state === MembershipState.Member && (
          <Select
            defaultValue={member.role}
            sx={{ mt: 2, fontSize: 0 }}
            onChange={(e) => updateMembership(member, e.target.value)}
          >
            <option value={MembershipRole.Owners}>Owner</option>
            <option value={MembershipRole.Maintainers}>Maintainer</option>
            <option value={MembershipRole.ReadData}>Read Data</option>
            <option value={MembershipRole.WriteData}>Write Data</option>
          </Select>
        )}
        {(member.state === MembershipState.Member ||
          member.state === MembershipState.Invited) && (
          <Box sx={{ textAlign: "right" }}>
            <SourceButton
              variant="error"
              onClick={(e) => revokeMembership(member, setMembers, account_id)}
              sx={{ fontSize: 0, mt: 2 }}
            >
              Revoke
            </SourceButton>
          </Box>
        )}
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
        active: false,
      });
    }

    if (profile?.account_type === AccountType.ORGANIZATION) {
      newSideNav.push({
        href: `/${account_id}/sc.members`,
        title: "Members",
        active: true,
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
    setMemberEditPermissions(editPermissions);
    setSideNavLinks(newSideNav);
  }, [account_id, user, profile, accountFlags]);

  const [members, setMembers] = useState([]);
  const [memberEditPermissions, setMemberEditPermissions] = useState(false);

  useEffect(() => {
    fetchMembers(account_id).then((members) => setMembers(members));
  }, [account_id, memberEditPermissions]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<MembershipInvitation>({
    resolver: zodResolver(MembershipInvitationSchema),
    defaultValues: {},
  });

  const onSubmit: SubmitHandler<MembershipInvitation> = (data) => {
    setSubmitting(true);
    setErrorMessage(null);
    fetch(`/api/v1/accounts/${account_id}/members`, {
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
          fetchMembers(account_id).then((members) => {
            setSubmitting(false);
            setMembers(members);
          });
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
          Members
        </Heading>
        <Divider />

        {memberEditPermissions ? (
          <>
            <Heading>Invite Member</Heading>
            <Card
              variant="code"
              sx={{ width: "fit-content", mb: 3 }}
              as="form"
              onSubmit={handleSubmit(onSubmit)}
            >
              <Paragraph sx={{ fontFamily: "mono", fontSize: 0, my: 0 }}>
                Account ID: <Input {...register("account_id")} />
                <Text sx={{ fontFamily: "mono", fontSize: 0, color: "red" }}>
                  {errors.account_id?.message}
                </Text>
              </Paragraph>
              <Paragraph sx={{ fontFamily: "mono", fontSize: 0, mt: 2 }}>
                Role:
                <Select {...register("role")}>
                  <option value={MembershipRole.Owners}>Owner</option>
                  <option value={MembershipRole.Maintainers}>Maintainer</option>
                  <option value={MembershipRole.ReadData}>Read Data</option>
                  <option value={MembershipRole.WriteData}>Write Data</option>
                </Select>
                <Text sx={{ fontFamily: "mono", fontSize: 0, color: "red" }}>
                  {errors.role?.message}
                </Text>
              </Paragraph>
              <Box sx={{ textAlign: "right" }}>
                <Button variant="success" sx={{ mt: 2 }}>
                  Invite
                </Button>
              </Box>
            </Card>
          </>
        ) : (
          <></>
        )}
        <Heading>Members</Heading>
        <Flex sx={{ gap: 3 }}>
          {members ? (
            members.map((member, i) => {
              return MemberCard({
                member,
                editable: memberEditPermissions,
                i,
                setMembers,
                account_id,
              });
            })
          ) : (
            <></>
          )}
        </Flex>
      </Layout>
    </>
  );
}
