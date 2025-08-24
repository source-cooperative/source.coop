"use client";

import {
  Box,
  Heading,
  Text,
  Link as RadixLink,
  Flex,
  Grid,
  Button,
} from "@radix-ui/themes";
import Link from "next/link";
import type {
  IndividualAccount,
  OrganizationalAccount,
  AccountEmail,
  AccountDomain,
} from "@/types/account";
import type { Product } from "@/types";
import { ProductsList } from "@/components/features/products/ProductsList";
import { OrganizationMembers } from "./OrganizationMembers";
import { ProfileAvatar } from "./ProfileAvatar";
import { WebsiteLink } from "./WebsiteLink";

interface OrganizationProfileProps {
  account: OrganizationalAccount;
  products: Product[];
  owner: IndividualAccount | null;
  admins: IndividualAccount[];
  members: IndividualAccount[];
}

export function OrganizationProfile({
  account,
  products,
  owner,
  admins,
  members,
}: OrganizationProfileProps) {
  const isAdmin = admins.some(
    (admin) => admin.account_id === account.account_id
  );
  const isOwner = owner?.account_id === account.account_id;
  const canEdit = isAdmin || isOwner;

  return (
    <Box>
      <Flex gap="4" mb="6" justify="between" align="start">
        <Flex gap="4">
          <ProfileAvatar account={account} size="8" />
          <Box>
            <Heading as="h1" size="8">
              {account.name}
            </Heading>
            <Text as="p" size="3" color="gray" mt="1">
              {account.metadata_public.bio}
            </Text>
          </Box>
        </Flex>
        {canEdit && (
          <Link href={`/${account.account_id}/edit`}>
            <Button>Edit Profile</Button>
          </Link>
        )}
      </Flex>

      <Grid columns="2" gap="6" mb="6">
        <Box>
          <Heading as="h2" size="4" mb="2">
            Organization Details
          </Heading>
          {account.metadata_public.domains?.map(
            (domain: AccountDomain, index: number) => (
              <Text as="div" size="2" key={index}>
                <WebsiteLink url={domain.domain} />
              </Text>
            )
          )}
          {account.emails?.find((email: AccountEmail) => email.is_primary)
            ?.address && (
            <Text as="p" size="2">
              Email:{" "}
              <RadixLink
                href={`mailto:${
                  account.emails?.find(
                    (email: AccountEmail) => email.is_primary
                  )?.address
                }`}
              >
                {
                  account.emails?.find(
                    (email: AccountEmail) => email.is_primary
                  )?.address
                }
              </RadixLink>
            </Text>
          )}
          {account.metadata_public.ror_id && (
            <Text as="p" size="2">
              ROR ID:{" "}
              <RadixLink
                href={`https://ror.org/${account.metadata_public.ror_id}`}
              >
                {account.metadata_public.ror_id}
              </RadixLink>
            </Text>
          )}
        </Box>

        <Box>
          <Heading as="h2" size="4" mb="2">
            Members
          </Heading>
          <OrganizationMembers
            owner={owner}
            admins={admins}
            members={members}
          />
        </Box>
      </Grid>

        <Box>
          <Heading as="h2" size="4" mb="2">
            Products
          </Heading>
        {products.length > 0 ? (
          <ProductsList products={products} />
        ) : (
          <Text as="p" size="2">
            No products available.
          </Text>
        )}
        </Box>
    </Box>
  );
}
