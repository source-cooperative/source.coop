import { Layout } from "@/components/Layout";
import { useRouter } from "next/router";
import { RepositoryList } from "@/components/repository/RepositoryList";

export default function Repositories() {
  const router = useRouter();
  const { page, limit, tags, q } = router.query;

  const query_page = page ? parseInt(page as string) : 1;
  const query_limit = limit ? parseInt(limit as string) : 10;
  const query_search_term = q as string;
  const query_tags = tags ? (tags as string).split(",") : [];

  return (
    <>
      <Layout>
        <RepositoryList
          page={query_page}
          limit={query_limit}
          tags={query_tags}
          search={query_search_term}
        />
      </Layout>
    </>
  );
}
