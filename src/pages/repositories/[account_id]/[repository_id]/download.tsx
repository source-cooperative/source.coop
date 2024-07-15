import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Divider } from "theme-ui";
import { RepositoryListing } from "@/components/RepositoryListing";

import { useRepository, useRepositorySideNav, useUser } from "@/lib/api";
import { DataCredentials } from "@/components/DataCredentials";


export default function RepositoryDownload() {
  const router = useRouter();

  const { repository, isError } = useRepository({
    account_id: router.query.account_id,
    repository_id: router.query.repository_id
  })

  const { sideNavLinks } = useRepositorySideNav({
    account_id: router.query.account_id,
    repository_id: router.query.repository_id,
    active_page: "access_data"
  })

  const { user } = useUser();

  return (
    <Layout notFound={isError && isError.status === 404} sideNavLinks={sideNavLinks}>
      
      <RepositoryListing repository={repository} truncate={false} />
      <Divider />
      <DataCredentials repository={repository} />
    </Layout>
  )
}
