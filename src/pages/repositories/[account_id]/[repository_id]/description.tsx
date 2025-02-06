import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Markdown } from "@/components/viewers/Markdown";
import { RepositoryListing } from "@/components/repository/RepositoryListing";
import { RepositorySideNavLinks } from "@/components/RepositorySideNav";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { Repository } from "@/api/types";
import { ClientError } from "@/lib/client/accounts";
import { Grid, Box } from "theme-ui";
import { Meta } from "@/components/Meta";
import { GetServerSideProps } from 'next'
import Head from "next/head";
import { RepositoryMeta } from '@/components/RepositoryMeta';

interface Props {
  initialData?: Repository;
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { account_id, repository_id } = context.params || {};
  
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/repositories/${account_id}/${repository_id}`
    );
    
    if (!res.ok) {
      throw new Error('Failed to fetch');
    }

    const repository = await res.json();
    
    return {
      props: {
        initialData: repository,
      },
    };
  } catch (error) {
    console.error('Error fetching repository:', error);
    return {
      props: {
        initialData: null,
      },
    };
  }
};

export default function Description({ initialData }: Props) {
  const router = useRouter();
  const [accountId, setAccountId] = useState<string>(null);
  const [repositoryId, setRepositoryId] = useState<string>(null);

  useEffect(() => {
    if (router.isReady) {
      const { account_id, repository_id } = router.query;
      setAccountId(account_id as string);
      setRepositoryId(repository_id as string);
    }
  }, [router.isReady, router.query]);

  const { data: repository, error: repositoryError } = useSWR<Repository, ClientError>(
    accountId && repositoryId
      ? { path: `/api/v1/repositories/${accountId}/${repositoryId}` }
      : null,
    {
      refreshInterval: 0,
    }
  );

  const sideNavLinks = RepositorySideNavLinks({
    account_id: accountId,
    repository_id: repositoryId,
  });

  if (!accountId || !repositoryId) {
    return <div>Loading...</div>;
  }

  return (
    <Layout
      notFound={repositoryError && repositoryError.status === 404}
      sideNavLinks={sideNavLinks}
    >
      {/* Your description page content here */}
    </Layout>
  );
}
