import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Markdown } from "@/components/viewers/Markdown";
import { RepositoryListing } from "@/components/repository/RepositoryListing";
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
      active: true,
    },
    {
      title: "Browse",
      href: `/${account_id}/${repository_id}`,
    },
    {
      title: "Download",
      href: `/repositories/${account_id}/${repository_id}/download`,
    },
  ];

  return (
    <Layout notFound={error != null} sideNavLinks={sideNavLinks}>
      <RepositoryListing repository={repository} truncate={false} />
      {repository ? (
        <Markdown
          url={`${process.env.NEXT_PUBLIC_S3_ENDPOINT}/${account_id}/${repository_id}/README.md`}
        />
      ) : (
        <></>
      )}
    </Layout>
  );
}
