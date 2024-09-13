import { AccountProfileResponse } from "@/api/types";
import { ClientError } from "@/lib/client/accounts";
import { AccountObject } from "@/components/account/AccountObject";
import { AccountSideNavLinks } from "@/components/AccountSideNav";
import { InviteMember } from "@/components/account/InviteMember";
import { Layout } from "@/components/Layout";
import { MemberList } from "@/components/account/MemberList";
import { useRouter } from "next/router";
import useSWR from "swr";
import { Grid, Box } from "theme-ui";

export default function TenantDetails() {
  const router = useRouter();
  const { account_id } = router.query;
  const sideNavLinks = AccountSideNavLinks({
    account_id: account_id as string,
  });

  const { error: profileError } = useSWR<AccountProfileResponse, ClientError>(
    account_id ? { path: `/api/v1/accounts/${account_id}/profile` } : null,
    {
      refreshInterval: 0,
    }
  );

  return (
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
          gridTemplateColumns: ["1fr", "1fr", "1fr 3fr", "1fr 5fr"],
        }}
      >
        <Box sx={{ gridColumn: "1 / -1" }}>
          <AccountObject account_id={account_id as string} />
        </Box>
        <InviteMember account_id={account_id as string} />
        <MemberList account_id={account_id as string} />
      </Grid>
    </Layout>
  );
}
