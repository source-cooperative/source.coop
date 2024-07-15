import { Layout } from "@/components/Layout";
import { ListUser } from "@/components/UserObject";
import { useState } from "react";
import { useRouter } from "next/router";
import { Divider, Grid, Heading, Box } from "theme-ui";
import { FormCheckbox } from "@/components/Form";
import SourceButton from "@/components/Button";

import { useProfile, useAccountSideNav, setUserFlags } from "@/lib/api";
import { getFormValues } from "@/lib/utils";

export default function TenantDetails() {
  const [submittable, setSubmittable] = useState(true);
  const router = useRouter();

  const { links } = useAccountSideNav({account_id: router.query.account_id, active_page: "manage"})
  const { profile, isError } = useProfile({
    account_id: router.query.account_id
  });

  function updateFlags(e) {
        e.stopPropagation();
        e.preventDefault();
        setSubmittable(false);

        const { account_id } = router.query;
        const body = getFormValues({e, form: e.currentTarget.parentElement.parentElement.parentElement});
        var flags = [];

        if (body["admin"] == "on") {
            flags.push("admin")
        }

        if (body["create_repositories"] == "on") {
            flags.push("create_repository")
        }

        setUserFlags({ account_id, flags }).then(() => {
          setSubmittable(true);
        })
    }


  return (
    <>
      <Layout notFound={isError && isError.status === 404} sideNavLinks={links}>
        <ListUser profile={profile} />
        <Divider />
        {
            !profile ? <Heading as ="h2">Loading...</Heading> :
            <Grid sx={{
                gridTemplateColumns: "1fr",
                justifyContent: "stretch",
                gridGap: 4,
              }}>
              <Heading as="h2">Manage User</Heading>
              <Box as="form">
                  <Grid sx={{
                  gridTemplateColumns: ["1fr", "1fr 1fr fr 3fr", "1fr 1fr 3fr", "1fr 1fr 5fr"]
                  }}>
                      <FormCheckbox name="create_repositories" defaultValue={profile.flags.includes("create_repository")} label={"Create Repositories"} sx={{gridColumnStart: 1, gridColumnEnd: 2}} />
                      <FormCheckbox name="admin" defaultValue={profile.flags.includes("admin")} label={"Admin"} sx={{gridColumnStart: 1, gridColumnEnd: 2}} />
      
                      <Box sx={{gridColumnStart: 1, gridColumnEnd: "end"}}>
                          <SourceButton disabled={!submittable} onClick={updateFlags}>Save</SourceButton>
                      </Box>
                  </Grid>
              </Box>
              </Grid>
        }
      </Layout>
    </>
  );
}
