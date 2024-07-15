import { Layout } from "@/components/Layout";
import { useRouter } from "next/router";
import { RepositoryList } from "@/components/RepositoryList";
import { useRepositoryList } from "@/lib/api";

export default function Repositories() {
  const router = useRouter();
  const { result, isLoading, isError } = useRepositoryList({
    next: router.query.next,
    limit: router.query.limit,
    tags: router.query.tags,
    q: router.query.q,
   });
  
  return (
    <>
      <Layout>
        <RepositoryList repositoryResult={result} isLoading={isLoading} isError={isError} />
      </Layout>
    </>
  );
}
