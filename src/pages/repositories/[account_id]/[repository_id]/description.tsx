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
  let response = await fetch(url);

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

export default function RepositoryDescription() {
  const router = useRouter();
  const { account_id, repository_id } = router.query;
  const { data: repository } = useSWR<Repository>(
    account_id && repository_id 
      ? `/api/repositories/${account_id}/${repository_id}`
      : null
  );

  const sideNavLinks = repository 
    ? RepositorySideNavLinks({ repository })
    : [];

  return (
    <Layout 
      title={repository?.name || 'Loading...'}
      sideNavLinks={sideNavLinks}
    >
      {repository && <RepositoryMeta repository={repository} />}
    </Layout>
  );
}
