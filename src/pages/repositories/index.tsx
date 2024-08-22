import { Layout } from "@/components/Layout";
import { useRouter } from "next/router";
import { RepositoryList } from "@/components/RepositoryList";
import { useRepositoryList } from "@/lib/api";
import { listRepositories } from "@/lib/client/repositories";

export default function Repositories() {
  const router = useRouter();
  const { next, limit, tags, q } = router.query;

  const query_page = next ? parseInt(next as string) : 1;
  const query_limit = limit ? parseInt(limit as string) : 10;
  const query_search_term = q as string;
  const query_tags = tags ? (tags as string).split(",") : [];

  const { data, error } = listRepositories(
    query_page,
    query_limit,
    query_search_term,
    query_tags
  );
  /*
  const { result, isLoading, isError } = useRepositoryList({
    next: router.query.next,
    limit: router.query.limit,
    tags: router.query.tags,
    q: router.query.q,
   });
   */

  return (
    <>
      <Layout>
        <RepositoryList
          repositoryResult={data}
          isLoading={!data && !error}
          isError={error}
        />
      </Layout>
    </>
  );
}
