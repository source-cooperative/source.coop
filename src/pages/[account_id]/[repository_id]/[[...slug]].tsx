import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import RepositoryBrowser from "@/components/RepositoryBrowser";
import { getRepositorySideNavLinks } from "@/lib/sidenav/repositories";
import { RepositoryListing } from "@/components/RepositoryListing";
import { Divider } from "theme-ui";

import { useRepository, useRepositorySideNav } from "@/lib/api";
import { getRepository } from "@/lib/client/repositories";

export default function RepositoryDetail() {
  const router = useRouter();

  const { account_id, repository_id } = router.query;
  const { data: repository, error } = getRepository(
    account_id as string,
    repository_id as string
  );

  return (
    <Layout notFound={error && error.status === 404} sideNavLinks={[]}>
      <RepositoryListing repository={repository} truncate={false} />
      <Divider />
      <RepositoryBrowser
        account_id={account_id}
        repository_id={repository_id}
      />
    </Layout>
  );
}
