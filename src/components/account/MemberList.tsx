import { Box, Text, Grid, Select, Button, Paragraph, Alert } from "theme-ui";
import SourceLink from "../SourceLink";
import {
  AccountFlags,
  Membership,
  MembershipRole,
  MembershipState,
  UserSession,
} from "@/api/types";
import { ClientError } from "@/lib/client/accounts";
import useSWR from "swr";
import { useState } from "react";

export function MemberList({
  account_id,
  repository_id,
}: {
  account_id: string;
  repository_id?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const {
    data: memberships,
    mutate: reloadMemberships,
    error,
  } = useSWR<Membership[], ClientError>(
    account_id && !repository_id
      ? { path: `/api/v1/accounts/${account_id}/members` }
      : account_id && repository_id
      ? { path: `/api/v1/repositories/${account_id}/${repository_id}/members` }
      : null,
    {
      refreshInterval: 0,
    }
  );

  const { data: user } = useSWR<UserSession, ClientError>(
    account_id ? { path: `/api/v1/whoami` } : null,
    {
      refreshInterval: 0,
    }
  );

  const activeMembers = memberships
    ?.filter((membership) => membership.state === MembershipState.Member)
    .sort(
      (a, b) =>
        new Date(a.state_changed).getTime() -
        new Date(b.state_changed).getTime()
    );

  const invitedMembers = memberships
    ?.filter((membership) => membership.state === MembershipState.Invited)
    .sort(
      (a, b) =>
        new Date(a.state_changed).getTime() -
        new Date(b.state_changed).getTime()
    );

  const previousMembers = memberships
    ?.filter((membership) => membership.state === MembershipState.Revoked)
    .sort(
      (a, b) =>
        new Date(b.state_changed).getTime() -
        new Date(a.state_changed).getTime()
    );

  function revokeMembership({ member }: { member: Membership }) {
    const confirmed = confirm(
      "Are you sure you want to revoke this account's membership?"
    );

    if (!confirmed) {
      return null;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    fetch(`/api/v1/memberships/${member.membership_id}/revoke`, {
      method: "POST",
      credentials: "include",
    }).then((res) => {
      if (res.ok) {
        setSubmitting(false);
        setSuccessMessage("Saved");
        reloadMemberships();
      } else {
        res.json().then((data) => {
          setSubmitting(false);
          setErrorMessage(data.message);
        });
      }
    });
  }

  function updateMembership({
    member,
    new_role,
  }: {
    member: Membership;
    new_role: MembershipRole;
  }) {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    fetch(`/api/v1/memberships/${member.membership_id}/update-role`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(new_role),
    }).then((res) => {
      if (res.ok) {
        setSubmitting(false);
        setSuccessMessage("Saved");
        reloadMemberships();
      } else {
        res.json().then((data) => {
          setSubmitting(false);
          setErrorMessage(data.message);
        });
      }
    });
  }

  let hasEditPermissions = false;
  if (user && user?.account?.flags?.includes(AccountFlags.ADMIN)) {
    hasEditPermissions = true;
  } else if (user && user?.account?.account_id === account_id) {
    hasEditPermissions = true;
  } else {
    if (user) {
      for (const membership of user?.memberships) {
        if (
          membership.membership_account_id === account_id &&
          !membership.repository_id &&
          membership.state === MembershipState.Member &&
          (membership.role === MembershipRole.Owners ||
            membership.role === MembershipRole.Maintainers)
        ) {
          hasEditPermissions = true;
          break;
        }
      }

      if (repository_id) {
        for (const membership of user?.memberships) {
          if (
            membership.membership_account_id === account_id &&
            membership.repository_id === repository_id &&
            membership.state === MembershipState.Member &&
            (membership.role === MembershipRole.Owners ||
              membership.role === MembershipRole.Maintainers)
          ) {
            hasEditPermissions = true;
            break;
          }
        }
      }
    }
  }

  if (error && error.status === 401) {
    return (
      <Box variant="cards.componentMessage">
        You do not have permission to view this account's members.
      </Box>
    );
  }

  if (!hasEditPermissions) {
    if (activeMembers?.length > 0) {
      return (
        <Box>
          <Text variant="formTitle">Members</Text>
          <Grid
            variant="form"
            sx={{
              gridTemplateColumns: ["1fr", "1fr", "1fr", "1fr"],
              alignItems: "center",
              mb: 3,
            }}
          >
            {activeMembers.map((membership) => (
              <>
                <Box sx={{ mt: [2, 0, 0, 0] }}>
                  <Text sx={{ fontSize: 1, fontWeight: "bold" }}>
                    <SourceLink href={`/${membership.account_id}`}>
                      @{membership.account_id}
                    </SourceLink>
                  </Text>
                  <Paragraph
                    sx={{ fontSize: 0, fontFamily: "mono", py: 0, my: 0 }}
                  >
                    Member Since{" "}
                    {new Date(membership.state_changed).toLocaleDateString()}
                  </Paragraph>
                </Box>
              </>
            ))}
          </Grid>
        </Box>
      );
    }

    return (
      <>
        <Box sx={{ gridColumn: "1 / -1" }}>
          <Text variant="formTitle">Members</Text>
          <Grid
            variant="form"
            sx={{
              gridTemplateColumns: "1fr",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Box variant="cards.componentMessage">
              This account has no members.
            </Box>
          </Grid>
        </Box>
      </>
    );
  }

  return (
    <Box>
      {(errorMessage || successMessage) && (
        <Box variant="cards.formMessageBox">
          {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
          {successMessage && <Alert variant="success">{successMessage}</Alert>}
        </Box>
      )}
      <fieldset disabled={submitting}>
        {activeMembers?.length > 0 && (
          <>
            <Text variant="formTitle">Members</Text>
            <Grid
              variant="form"
              sx={{
                gridTemplateColumns: [
                  "1fr",
                  "1fr auto auto",
                  "1fr auto auto",
                  "1fr auto auto",
                ],
                alignItems: "center",
                mb: 3,
              }}
            >
              {activeMembers.map((membership) => (
                <>
                  <Box sx={{ mt: [2, 0, 0, 0] }}>
                    <Text sx={{ fontSize: 1, fontWeight: "bold" }}>
                      <SourceLink href={`/${membership.account_id}`}>
                        @{membership.account_id}
                      </SourceLink>
                    </Text>
                    <Paragraph
                      sx={{ fontSize: 0, fontFamily: "mono", py: 0, my: 0 }}
                    >
                      Member Since{" "}
                      {new Date(membership.state_changed).toLocaleDateString()}
                    </Paragraph>
                  </Box>
                  <Select
                    variant="minimalSelect"
                    defaultValue={membership.role}
                    onChange={(e) =>
                      updateMembership({
                        member: membership,
                        new_role: e.target.value as MembershipRole,
                      })
                    }
                  >
                    <option value={MembershipRole.Owners}>Owner</option>
                    <option value={MembershipRole.Maintainers}>
                      Maintainer
                    </option>
                    <option value={MembershipRole.ReadData}>Read Data</option>
                    <option value={MembershipRole.WriteData}>Write Data</option>
                  </Select>
                  <Button
                    variant="formDestructive"
                    onClick={() => revokeMembership({ member: membership })}
                  >
                    Revoke Membership
                  </Button>
                </>
              ))}
            </Grid>
          </>
        )}

        {invitedMembers?.length > 0 && (
          <>
            <Text variant="formTitle">Invited Members</Text>
            <Grid
              variant="form"
              sx={{
                gridTemplateColumns: [
                  "1fr",
                  "1fr auto",
                  "1fr auto",
                  "1fr auto",
                ],
                alignItems: "center",
                mb: 3,
              }}
            >
              {invitedMembers.map((membership) => (
                <>
                  <Box>
                    <Text sx={{ fontSize: 1, fontWeight: "bold" }}>
                      <SourceLink href={`/${membership.account_id}`}>
                        @{membership.account_id}
                      </SourceLink>
                    </Text>
                    <Paragraph
                      sx={{ fontSize: 0, fontFamily: "mono", py: 0, my: 0 }}
                    >
                      Invited on{" "}
                      {new Date(membership.state_changed).toLocaleDateString()}
                    </Paragraph>
                  </Box>
                  <Button
                    variant="formDestructive"
                    onClick={() => revokeMembership({ member: membership })}
                  >
                    Rescind Invitation
                  </Button>
                </>
              ))}
            </Grid>
          </>
        )}

        {previousMembers?.length > 0 && (
          <>
            <Text variant="formTitle">Previous Memberships</Text>
            <Grid
              variant="form"
              sx={{
                alignItems: "center",
              }}
            >
              {previousMembers.map((membership) => (
                <>
                  <Box>
                    <Text sx={{ fontSize: 1, fontWeight: "bold" }}>
                      <SourceLink href={`/${membership.account_id}`}>
                        @{membership.account_id}
                      </SourceLink>
                    </Text>
                    <Paragraph
                      sx={{ fontSize: 0, fontFamily: "mono", py: 0, my: 0 }}
                    >
                      Departed on{" "}
                      {new Date(membership.state_changed).toLocaleDateString()}
                    </Paragraph>
                  </Box>
                </>
              ))}
            </Grid>
          </>
        )}
      </fieldset>
    </Box>
  );
}
