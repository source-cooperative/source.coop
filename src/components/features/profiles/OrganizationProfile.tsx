"use client";

import {
  Box,
  Heading,
  Text,
  Link as RadixLink,
  Flex,
  Grid,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
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
import { ProfileLocation } from "./ProfileLocation";
import { editAccountProfileUrl, newProductUrl } from "@/lib/urls";
import { EditButton } from "@/components/core";

interface OrganizationProfileProps {
  account: OrganizationalAccount;
  products: Product[];
  owners: IndividualAccount[];
  admins: IndividualAccount[];
  members: IndividualAccount[];
  canEdit: boolean;
  canCreateProduct: boolean;
}

export function OrganizationProfile({
  account,
  products,
  owners,
  admins,
  members,
  canEdit,
  canCreateProduct,
}: OrganizationProfileProps) {
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
          <EditButton href={editAccountProfileUrl(account.account_id)} />
        )}
      </Flex>

      <Grid columns={{ initial: "1", md: "2" }} gap="6" mb="6">
        <Box>
          <Heading as="h2" size="4" mb="2">
            Organization Details
          </Heading>

          {account.metadata_public.location && (
            <Text as="div" size="2" color="gray">
              <ProfileLocation location={account.metadata_public.location} />
            </Text>
          )}

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
            owners={owners}
            admins={admins}
            members={members}
          />
        </Box>
      </Grid>

      <Box>
        <Flex justify="between" align="center" mb="2">
          <Heading as="h2" size="4">
            Products
          </Heading>
          {canCreateProduct && (
            <RadixLink asChild size="2">
              <Link href={newProductUrl(account.account_id)}>
                <Flex as="span" align="center" gap="1">
                  <PlusIcon /> New product
                </Flex>
              </Link>
            </RadixLink>
          )}
        </Flex>
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
