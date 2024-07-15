import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Markdown } from "@/components/viewers/Markdown";
import { Divider } from "theme-ui";
import { RepositoryListing } from "@/components/RepositoryListing";

import { useRepository, useRepositorySideNav } from "@/lib/api";


export default function RepositoryDetail() {
  const router = useRouter();

  const { repository, isLoading, isError } = useRepository({
    account_id: router.query.account_id,
    repository_id: router.query.repository_id
  })

  const { sideNavLinks } = useRepositorySideNav({
    account_id: router.query.account_id,
    repository_id: router.query.repository_id,
    active_page: "readme"
  })

  return (
    <Layout notFound={isError && isError.status === 404} sideNavLinks={sideNavLinks}>
      
      <RepositoryListing repository={repository} truncate={false} />
      <Divider />
      <Markdown url={repository ? `${repository.data.cdn}/${repository.account_id}/${repository.repository_id}/README.md` : null} />
    </Layout>
  )
}
