import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { RepositoryListing } from "@/components/repository/RepositoryListing";

import { getRepository } from "@/lib/client/repositories";
import { SideNavLink } from "@/lib/types";

export default function RepositoryDownload() {
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
    },
    {
      title: "Download",
      href: `/repositories/${account_id}/${repository_id}/download`,
      active: true,
    },
  ];

  return (
    <Layout notFound={error != null} sideNavLinks={sideNavLinks}>
      <RepositoryListing repository={repository} truncate={false} />
    </Layout>
  );
}
