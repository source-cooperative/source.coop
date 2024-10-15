import useSWR from "swr";
import { UserSession, MembershipState, Membership } from "@/api/types";
import { ClientError } from "@/lib/client/accounts";
import { Box, Text, Grid, Button, Alert } from "theme-ui";
import SourceLink from "../SourceLink";
import { useState } from "react";

export function Invitations({ account_id }: { account_id: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const { data: user, mutate: refreshUser } = useSWR<UserSession, ClientError>(
    { path: `/api/v1/whoami` },
    {
      refreshInterval: 0,
    }
  );

  if (!user || user?.account?.account_id !== account_id) {
    return <></>;
  }

  const invitations = user
    ? user?.memberships
        ?.filter((membership) => membership.state === MembershipState.Invited)
        .sort(
          (a, b) =>
            new Date(a.state_changed).getTime() -
            new Date(b.state_changed).getTime()
        )
    : [];

  if (invitations.length === 0 && (errorMessage || successMessage)) {
    return (
      <>
        <Box variant="cards.formMessageBox" sx={{ gridColumn: "1 / -1" }}>
          {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
          {successMessage && <Alert variant="success">{successMessage}</Alert>}
        </Box>
      </>
    );
  } else if (invitations.length === 0) {
    return <></>;
  }
  enum Action {
    ACCEPT = "accept",
    DECLINE = "revoke",
  }

  function performInvitationAction({
    invitation,
    action,
  }: {
    invitation: Membership;
    action: Action;
  }) {
    fetch(`/api/v1/memberships/${invitation.membership_id}/${action}`, {
      method: "POST",
      credentials: "include",
    }).then((res) => {
      if (res.ok) {
        setSuccessMessage("Invitation Accepted");
        setSubmitting(false);
        refreshUser();
      } else {
        res.json().then((data) => {
          setSubmitting(false);
          setErrorMessage(data.error);
        });
      }
    });
  }

  return (
    <>
      <Box sx={{ gridColumn: "1 / -1" }}>
        <Text variant="formTitle">Pending Invitations</Text>
        <fieldset disabled={submitting}>
          <Grid
            variant="form"
            sx={{
              gridTemplateColumns: [
                "1fr 1fr",
                "1fr auto auto",
                "1fr auto auto",
                "1fr auto auto",
              ],
              alignItems: "center",
            }}
          >
            {invitations.map((invitation) => {
              return (
                <>
                  <Box sx={{ gridColumn: ["span 2", "1", "1", "1"] }}>
                    <Text sx={{ fontWeight: "body", fontSize: 1 }}>
                      Invited to{" "}
                      <SourceLink
                        href={
                          invitation.repository_id
                            ? `/repositories/${invitation.membership_account_id}/${invitation.repository_id}/description`
                            : `/${invitation.membership_account_id}`
                        }
                      >
                        @{invitation.membership_account_id}
                        {invitation.repository_id &&
                          `/${invitation.repository_id}`}
                      </SourceLink>{" "}
                      on{" "}
                      {new Date(invitation.state_changed).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      )}
                    </Text>
                  </Box>
                  <Button
                    variant="formSuccess"
                    onClick={(e) => {
                      e.preventDefault();
                      performInvitationAction({
                        invitation,
                        action: Action.ACCEPT,
                      });
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="formDestructive"
                    onClick={(e) => {
                      e.preventDefault();
                      performInvitationAction({
                        invitation,
                        action: Action.DECLINE,
                      });
                    }}
                  >
                    Decline
                  </Button>
                </>
              );
            })}
          </Grid>
          {(errorMessage || successMessage) && (
            <Box variant="cards.formMessageBox">
              {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
              {successMessage && (
                <Alert variant="success">{successMessage}</Alert>
              )}
            </Box>
          )}
        </fieldset>
      </Box>
    </>
  );
}
