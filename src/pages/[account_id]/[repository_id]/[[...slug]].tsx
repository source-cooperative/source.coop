import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import RepositoryBrowser from "@/components/repository/RepositoryBrowser";
import { getRepositorySideNavLinks } from "@/lib/sidenav/repositories";
import { RepositoryListing } from "@/components/repository/RepositoryListing";
import { Divider } from "theme-ui";

import { useRepository, useRepositorySideNav } from "@/lib/api";
import { getRepository } from "@/lib/client/repositories";
import { SideNavLink } from "@/lib/types";

export default function RepositoryDetail() {
  const router = useRouter();

  const { account_id, repository_id } = router.query;
  const { data: repository, error } = getRepository(
    account_id as string,
    repository_id as string
  );

  const sideNavLinks: SideNavLink[] = [
    {
      title: "Read Me",
      href: `/repositories/${account_id}/${repository_id}/description`,
    },
    {
      title: "Browse",
      href: `/${account_id}/${repository_id}`,
      active: true,
    },
    {
      title: "Download",
      href: `/repositories/${account_id}/${repository_id}/download`,
    },
  ];

  return (
    <Layout notFound={error != null} sideNavLinks={sideNavLinks}>
      <RepositoryListing repository={repository} truncate={false} />
      <Divider />
      <RepositoryBrowser
        account_id={account_id}
        repository_id={repository_id}
      />
    </Layout>
  );
}
