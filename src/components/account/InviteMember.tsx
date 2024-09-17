import { Box, Grid, Button, Input, Text, Select, Alert } from "theme-ui";
import { useState } from "react";
import {
  MembershipInvitation,
  MembershipRole,
  Membership,
  MembershipInvitationSchema,
  UserSession,
  AccountFlags,
  MembershipState,
} from "@/api/types";
import useSWR from "swr";
import { ClientError } from "@/lib/client/accounts";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export function InviteMember({
  account_id,
  repository_id,
}: {
  account_id: string;
  repository_id?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const { mutate: reloadMemberships } = useSWR<Membership[], ClientError>(
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MembershipInvitation>({
    resolver: zodResolver(MembershipInvitationSchema),
    defaultValues: {},
  });

  const onSubmit: SubmitHandler<MembershipInvitation> = (data) => {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (account_id && !repository_id) {
      fetch(`/api/v1/accounts/${account_id}/members`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((res) => {
        if (res.ok) {
          setSubmitting(false);
          setSuccessMessage("Invited");
          reloadMemberships();
        } else {
          res.json().then((data) => {
            setSubmitting(false);
            setErrorMessage(data.message);
          });
        }
      });
    } else if (account_id && repository_id) {
      fetch(`/api/v1/repositories/${account_id}/${repository_id}/members`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((res) => {
        if (res.ok) {
          setSubmitting(false);
          setSuccessMessage("Invited");
          reloadMemberships();
        } else {
          res.json().then((data) => {
            setSubmitting(false);
            setErrorMessage(data.message);
          });
        }
      });
    }
  };

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

  if (!hasEditPermissions) {
    return <></>;
  }

  return (
    <Box>
      <Box as="form" onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={submitting}>
          <Text variant="formTitle">Invite Account</Text>
          <Grid variant="form">
            {(errorMessage || successMessage) && (
              <Box variant="cards.formMessageBox">
                {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
                {successMessage && (
                  <Alert variant="success">{successMessage}</Alert>
                )}
              </Box>
            )}
            <Box variant="formField" sx={{ gridColumn: 1 }}>
              <Text variant="formLabel">Account ID</Text>
              <Input {...register("account_id")} />
              <Text variant="formError">{errors.account_id?.message}</Text>
            </Box>
            <Box variant="formField" sx={{ gridColumn: 1 }}>
              <Text variant="formLabel">Account ID</Text>
              <Select {...register("role")}>
                <option value={MembershipRole.Owners}>Owner</option>
                <option value={MembershipRole.Maintainers}>Maintainer</option>
                <option value={MembershipRole.ReadData}>Read Data</option>
                <option value={MembershipRole.WriteData}>Write Data</option>
              </Select>
            </Box>
            <Box variant="cards.formButtonBox" sx={{ gridColumns: "1 / -1" }}>
              <Button variant="formSubmit">Invite</Button>
            </Box>
          </Grid>
        </fieldset>
      </Box>
    </Box>
  );
}
