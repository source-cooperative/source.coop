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
  repository: {
    meta?: {
      title?: string;
      description?: string;
    };
  };
}

async function getRepository(account_id: string, repository_id: string) {
  // Use NEXT_PUBLIC_API_URL or fall back to relative URL
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const response = await fetch(
    `${baseUrl}/api/v1/repositories/${account_id}/${repository_id}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Repository not found');
    }
    throw new Error('Failed to fetch repository');
  }

  return response.json();
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { account_id, repository_id } = context.params || {};
  
  if (!account_id || !repository_id) {
    return { notFound: true };
  }

  try {
    const repository = await getRepository(account_id as string, repository_id as string);

    return {
      props: {
        repository,
      },
    };
  } catch (error) {
    console.error('Error fetching repository:', error);
    return { notFound: true };
  }
};

export default function Description({ repository }: Props) {
  const router = useRouter();

  const { account_id, repository_id } = router.query;
  const [accountId, setAccountId] = useState<string>(account_id as string);
  const [repositoryId, setRepositoryId] = useState<string>(
    repository_id as string
  );

  useEffect(() => {
    setAccountId(account_id as string);
    setRepositoryId(repository_id as string);
  }, [account_id, repository_id]);

  const {
    data: repositoryData,
    mutate: refreshRepository,
    isLoading: repositoryIsLoading,
    error: repositoryError,
  } = useSWR<Repository, ClientError>(
    account_id && repository_id
      ? { path: `/api/v1/repositories/${account_id}/${repository_id}` }
      : null,
    {
      refreshInterval: 0,
    }
  );

  const sideNavLinks = RepositorySideNavLinks({
    account_id: accountId,
    repository_id: repositoryId,
  });

  return (
    <>
      <RepositoryMeta repository={repository} />
      <Layout
        notFound={repositoryError && repositoryError.status === 404}
        sideNavLinks={sideNavLinks}
        title={repository.meta?.title || repository_id}
      >
        <RepositoryListing repository={repository || repositoryData} truncate={false} />
      </Layout>
    </>
  );
}
