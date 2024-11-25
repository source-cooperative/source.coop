import { useState, useEffect } from "react";
import useSWR from "swr";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Repository,
  RepositoryCreationRequest,
  RepositoryDataMode,
  RepositoryState,
  RepositoryUpdateRequest,
  RepositoryUpdateRequestSchema,
} from "@/api/types";
import {
  Alert,
  Box,
  Text,
  Grid,
  Card,
  Select,
  Button,
  Input,
  Paragraph,
} from "theme-ui";
import { ClientError } from "@/lib/client/accounts";
import {
  MembershipState,
  MembershipRole,
  AccountFlags,
  UserSession,
} from "@/api/types";
import SourceLink from "@/components/SourceLink";

export function AccessData({
  account_id,
  repository_id,
}: {
  account_id: string;
  repository_id: string;
}) {
  const {
    data: repository,
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

  const { data: user } = useSWR<UserSession, ClientError>(
    { path: `/api/v1/whoami` },
    {
      refreshInterval: 0,
    }
  );

  let hasEditPermissions = false;
  if (user && user?.account?.flags?.includes(AccountFlags.ADMIN)) {
    hasEditPermissions = true;
  } else if (user && user?.account?.account_id === account_id) {
    hasEditPermissions = true;
  } else {
    if (user) {
      for (const membership of user?.memberships) {
        if (
          membership.membership_account_id === account_id &&
          !membership.repository_id &&
          membership.state === MembershipState.Member &&
          (membership.role === MembershipRole.Owners ||
            membership.role === MembershipRole.Maintainers)
        ) {
          hasEditPermissions = true;
          break;
        } else if (
          membership.membership_account_id === account_id &&
          membership.repository_id === repository_id &&
          membership.state === MembershipState.Member &&
          (membership.role === MembershipRole.Owners ||
            membership.role === MembershipRole.Maintainers)
        ) {
          hasEditPermissions = true;
          break;
        }
      }
    }
  }

  if (repositoryError && repositoryError.status === 404) {
    return <></>;
  }

  if (!repository) {
    return <></>;
  }

  if (repositoryError) {
    return <Box variant="cards.componentMessage">Error loading repository</Box>;
  }

  return (
    <Grid sx={{ gap: 4 }}>
      {user && (
        <Box>
          <Text variant="formTitle">Authentication</Text>
          <Grid variant="form">
            {repository.data_mode !== RepositoryDataMode.Open && (
              <Text>
                NOTE: Authentication is required to browse and download this
                repository.
              </Text>
            )}
            <Paragraph>
              To authenticate to this repository, you can use either an API Key
              created under your account, an API Key created under the
              organization account that owns this repository, or an API Key
              created under this repository. You must configure your
              S3-Compatible client to use the API Key as your credentials.
              Authentication is required for all upload operations.
            </Paragraph>
            <Box>
              <Text>
                Example configuration for the AWS CLI (if you use this
                configuration, specify the {"--profile=sc"} parameter in CLI
                commands instead of the {"--endpoint-url"} parameter)
              </Text>
              <Card variant="code">
                <Text sx={{ display: "block" }}>[sc]</Text>
                <Text sx={{ display: "block" }}>
                  {"aws_access_key_id=<YOUR_API_ACCESS_KEY_ID_HERE>"}
                </Text>
                <Text sx={{ display: "block" }}>
                  {"aws_secret_access_key=<YOUR_API_SECRET_ACCESS_KEY_HERE>"}
                </Text>
                <Text sx={{ display: "block" }}>
                  {`endpoint_url=${process.env.NEXT_PUBLIC_S3_ENDPOINT}`}
                </Text>
              </Card>
            </Box>
          </Grid>
        </Box>
      )}
      <Box>
        <Text variant="formTitle">Download</Text>
        <Grid
          variant="form"
          sx={{
            gridTemplateColumns: ["1fr"],
          }}
        >
          <Paragraph>
            You can download and browse this repository using the Source
            Cooperative S3-Compatible API. To use this API, you must ensure that
            you specify the Endpoint URL parameter in requests.
          </Paragraph>

          <Box>
            <Text>List the contents of the repository</Text>
            <Card variant="code">
              aws s3 ls s3://{account_id}/{repository_id}/ --endpoint-url=
              {process.env.NEXT_PUBLIC_S3_ENDPOINT}
            </Card>
          </Box>
          <Box>
            <Text>
              Download the entire repository to the current working directory
            </Text>
            <Card variant="code">
              aws s3 sync s3://{account_id}/{repository_id}/ . --endpoint-url=
              {process.env.NEXT_PUBLIC_S3_ENDPOINT}
            </Card>
          </Box>
          <Box>
            <Text>
              Download a specific file to the current working directory
            </Text>
            <Card variant="code">
              aws s3 cp s3://{account_id}/{repository_id}/{"<PATH_TO_FILE>"} .
              --endpoint-url=
              {process.env.NEXT_PUBLIC_S3_ENDPOINT}
            </Card>
          </Box>
          <Text>
            NOTE:These examples refer to the{" "}
            <SourceLink href="https://aws.amazon.com/cli/">AWS CLI</SourceLink>,
            but you can use any S3-compatible client (such as{" "}
            <SourceLink href="https://boto3.amazonaws.com/v1/documentation/api/latest/index.html">
              boto3
            </SourceLink>
            ).
          </Text>
        </Grid>
      </Box>
      {hasEditPermissions && (
        <Box>
          <Text variant="formTitle">Upload</Text>
          <Grid
            variant="form"
            sx={{
              gridTemplateColumns: ["1fr"],
            }}
          >
            <Paragraph>
              You can upload to this repository using the Source Cooperative
              S3-Compatible API. To use this API, you must ensure that you
              specify the Endpoint URL parameter in requests.
            </Paragraph>
            <Box>
              <Text>Copy a single file to the repository</Text>
              <Card variant="code">
                aws s3 cp {"<PATH_TO_FILE>"} s3://{account_id}/{repository_id}/ --endpoint-url=
                {process.env.NEXT_PUBLIC_S3_ENDPOINT}
              </Card>
            </Box>
            <Box>
              <Text>Copy the entire working directory to the repository</Text>
              <Card variant="code">
                aws s3 sync . s3://{account_id}/{repository_id}/ --endpoint-url=
                {process.env.NEXT_PUBLIC_S3_ENDPOINT}
              </Card>
            </Box>
            <Text>
              NOTE:These examples refer to the{" "}
              <SourceLink href="https://aws.amazon.com/cli/">
                AWS CLI
              </SourceLink>
              , but you can use any S3-compatible client (such as{" "}
              <SourceLink href="https://boto3.amazonaws.com/v1/documentation/api/latest/index.html">
                boto3
              </SourceLink>
              ).
            </Text>
          </Grid>
        </Box>
      )}
    </Grid>
  );
}
