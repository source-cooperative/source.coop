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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = `${baseUrl}/api/v1/repositories/${account_id}/${repository_id}`;
  
  // First try without credentials for public access
  let response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    }
  });

  // If that fails, try with credentials
  if (!response.ok && response.status === 401) {
    response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });
  }

  if (!response.ok) {
    console.error('Repository fetch failed:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });
    throw new Error(`Failed to fetch repository: ${response.statusText}`);
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
    console.error('Error in getServerSideProps:', error);
    
    // Handle different error types
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }
    
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
