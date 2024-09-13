import { Layout } from "@/components/Layout";
import { useRouter } from "next/router";
import { Box, Grid } from "theme-ui";
import { AccountObject } from "@/components/account/AccountObject";
import { AccountProfileResponse } from "@/api/types";
import { ClientError } from "@/lib/client/accounts";
import useSWR from "swr";
import { AccountSideNavLinks } from "@/components/AccountSideNav";
import { EditProfileForm } from "@/components/account/EditProfileForm";
import { DangerBox } from "@/components/account/DangerBox";
import { FlagsForm } from "@/components/account/FlagsForm";
import { APIKeyForm } from "@/components/account/APIKeyForm";
import { APIKeyList } from "@/components/account/APIKeyList";
import { Invitations } from "@/components/account/Invitations";

export default function ManageAccount() {
  const router = useRouter();
  const { account_id } = router.query;
  const sideNavLinks = AccountSideNavLinks({
    account_id: account_id as string,
  });

  const { isLoading: _profileIsLoading, error: profileError } = useSWR<
    AccountProfileResponse,
    ClientError
  >(account_id ? { path: `/api/v1/accounts/${account_id}/profile` } : null, {
    refreshInterval: 0,
  });

  return (
    <>
      <Layout
        notFound={
          profileError &&
          (profileError.status === 404 || profileError.status === 401)
        }
        sideNavLinks={sideNavLinks}
      >
        <Grid
          sx={{
            gap: 4,
            gridTemplateColumns: [
              "1fr",
              "1fr 1fr",
              "1fr 1fr 1fr",
              "1fr 1fr 1fr 1fr",
            ],
          }}
        >
          <Box sx={{ gridColumn: "1 / -1" }}>
            <AccountObject account_id={account_id as string} />
          </Box>
          <Invitations account_id={account_id as string} />
          <Box sx={{ gridColumn: "1 / -1" }}>
            <EditProfileForm account_id={account_id as string} />
          </Box>

          <Box sx={{ gridColumn: "1" }}>
            <APIKeyForm account_id={account_id} />
          </Box>
          <Box
            sx={{
              gridColumn: ["span 1", "span 2", "span 2", "span 3"],
              gridRow: "span 4",
            }}
          >
            <APIKeyList account_id={account_id} />
          </Box>
          <FlagsForm account_id={account_id as string} />
          <DangerBox account_id={account_id as string} />
        </Grid>
      </Layout>
    </>
  );
}
