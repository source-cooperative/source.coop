import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import RepositoryBrowser from "@/components/RepositoryBrowser";
import { getRepositorySideNavLinks } from "@/lib/sidenav/repositories";
import { RepositoryListing } from "@/components/RepositoryListing";
import { Divider } from "theme-ui";

import { useRepository, useRepositorySideNav } from "@/lib/api";

export default function RepositoryDetail() {
  const router = useRouter();

  const {
    account_id,
    repository_id
  } = router.query;

  const { repository, isError } = useRepository({
    account_id: router.query.account_id,
    repository_id: router.query.repository_id
  })

  const { sideNavLinks } = useRepositorySideNav({
    account_id: router.query.account_id,
    repository_id: router.query.repository_id,
    active_page: "browse"
  })

  return (
    <Layout notFound={isError && isError.status === 404} sideNavLinks={sideNavLinks}>
      <RepositoryListing repository={repository} truncate={false} />
      <Divider />
      <RepositoryBrowser account_id={account_id} repository_id={repository_id}/>
    </Layout>
  )
}
