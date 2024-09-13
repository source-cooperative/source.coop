import { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Text,
  Input,
  Alert,
  Textarea,
  Grid,
  Button,
  Select,
} from "theme-ui";

import { Layout } from "@/components/Layout";
import { AccountObject } from "@/components/account/AccountObject";
import { AccountSideNavLinks } from "@/components/AccountSideNav";
import {
  AccountProfileResponse,
  RepositoryCreationRequest,
  RepositoryCreationRequestSchema,
} from "@/api/types";
import { ClientError } from "@/lib/client/accounts";
import { NewRepositoryForm } from "@/components/repository/NewRepositoryForm";

export default function TenantDetails() {
  const router = useRouter();
  const { account_id } = router.query;
  const sideNavLinks = AccountSideNavLinks({
    account_id: account_id as string,
  });

  const { data: profile, error: profileError } = useSWR<
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
          <Box sx={{ gridColumn: "1 / -1" }}>
            <NewRepositoryForm account_id={account_id as string} />
          </Box>
        </Grid>
      </Layout>
    </>
  );
}
