import { Layout } from "@/components/Layout";
import { useEffect, useState, version } from "react";
import { Heading } from "theme-ui";
import { RepositoryEditForm } from "@/components/RepositoryEditForm";
import { useRouter } from "next/router";
import { Divider } from "theme-ui";
import { RepositoryListing } from "@/components/RepositoryListing";
import { getRepositorySideNavLinks } from "@/lib/sidenav/repositories";

import { useRepository, useRepositorySideNav, useUser } from "@/lib/api";

export default function CreateRepository() {
  const router = useRouter();

  const { repository, isLoading, isError } = useRepository({
    account_id: router.query.account_id,
    repository_id: router.query.repository_id
  })

  const { sideNavLinks } = useRepositorySideNav({
    account_id: router.query.account_id,
    repository_id: router.query.repository_id,
    active_page: "edit"
  })

  return (
    <>
      <Layout notFound={isError && isError.status === 404} sideNavLinks={sideNavLinks}>
      <RepositoryListing repository={repository} truncate={false} />
      <Divider />
      <RepositoryEditForm account_id={router.query.account_id as string} repository_id={router.query.repository_id as string}/>
      </Layout>
    </>
  );
}
