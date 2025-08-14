// Server Component
import { Box, Text, Grid, Heading, Flex, Link as RadixLink } from '@radix-ui/themes';
import Link from 'next/link';
import type { AccountV2, IndividualAccount } from "@/types/account_v2";
import type { Account, Product } from "@/types";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProductList } from "../products/ProductList";
import { WebsiteLink } from "./WebsiteLink";
import { EmailVerificationStatus } from "./EmailVerificationStatus";
import { IndividualProfileActions } from "./IndividualProfileActions";

interface IndividualProfileProps {
  account: IndividualAccount;
  ownedProducts: Product[];
  contributedProducts: Product[];
  organizations: AccountV2[];
  showWelcome?: boolean;
  // Pagination props for owned products
  ownedProductsHasNextPage?: boolean;
  ownedProductsHasPreviousPage?: boolean;
  ownedProductsNextCursor?: string;
  ownedProductsPreviousCursor?: string;
  ownedProductsCurrentCursor?: string;
  // Pagination props for contributed products
  contributedProductsHasNextPage?: boolean;
  contributedProductsHasPreviousPage?: boolean;
  contributedProductsNextCursor?: string;
  contributedProductsPreviousCursor?: string;
  contributedProductsCurrentCursor?: string;
}

export function IndividualProfile({
  account,
  ownedProducts,
  contributedProducts,
  organizations,
  showWelcome = false,
  // Pagination props
  ownedProductsHasNextPage = false,
  ownedProductsHasPreviousPage = false,
  ownedProductsNextCursor,
  ownedProductsPreviousCursor,
  ownedProductsCurrentCursor,
  contributedProductsHasNextPage = false,
  contributedProductsHasPreviousPage = false,
  contributedProductsNextCursor,
  contributedProductsPreviousCursor,
  contributedProductsCurrentCursor,
}: IndividualProfileProps) {
  return (
    <Box>
      <IndividualProfileActions account={account} showWelcome={showWelcome} />

      <Box mb="6">
        <Flex gap="4" align="center" justify="between">
          <Flex gap="4" align="center">
            <ProfileAvatar account={account} size="6" />
            <Box>
              <Flex gap="2" align="center">
                <Heading size="8">{account.name}</Heading>
                <EmailVerificationStatus account={account} />
              </Flex>
              {account.metadata_public.bio && (
                <Text size="3" color="gray">
                  {account.metadata_public.bio}
                </Text>
              )}
            </Box>
          </Flex>
        </Flex>
      </Box>

      <Box mb="6">
        <Grid columns="3" gap="4">
          {account.metadata_public.domains &&
            account.metadata_public.domains.length > 0 && (
              <Box>
                <Text as="div" size="2" color="gray" mb="2">
                  {account.metadata_public.domains.length === 1
                    ? "Website"
                    : "Websites"}
                </Text>
                {account.metadata_public.domains.map((domain, index) => (
                  <Box
                    key={index}
                    mb={
                      index < (account.metadata_public.domains?.length ?? 0) - 1
                        ? "2"
                        : "0"
                    }
                  >
                    <WebsiteLink
                      website={{ url: `https://${domain.domain}` }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          {account.metadata_public.orcid && (
            <Box>
              <Text as="div" size="2" color="gray" mb="2">
                ORCID
              </Text>
              <RadixLink asChild>
                <a
                  href={`https://orcid.org/${account.metadata_public.orcid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {account.metadata_public.orcid}
                </a>
              </RadixLink>
            </Box>
          )}
        </Grid>
      </Box>

      {organizations.length > 0 && (
        <Box mb="6">
          <Heading size="4" mb="2">
            Organizations
          </Heading>
          <Grid columns="3" gap="4">
            {organizations.map((org) => (
              <Link
                key={org.account_id}
                href={`/${org.account_id}`}
                passHref
                legacyBehavior
              >
                <RadixLink>
                  <Flex gap="2" align="center">
                    <ProfileAvatar account={org} size="2" />
                    <Text>{org.name}</Text>
                  </Flex>
                </RadixLink>
              </Link>
            ))}
          </Grid>
        </Box>
      )}

      {ownedProducts.length > 0 && (
        <Box mb="6">
          <Heading size="4" mb="2">
            Products
          </Heading>
          <ProductList
            products={ownedProducts}
            hasNextPage={ownedProductsHasNextPage}
            hasPreviousPage={ownedProductsHasPreviousPage}
            nextCursor={ownedProductsNextCursor}
            previousCursor={ownedProductsPreviousCursor}
            currentCursor={ownedProductsCurrentCursor}
          />
        </Box>
      )}

      {contributedProducts.length > 0 && (
        <Box>
          <Heading size="4" mb="2">
            Contributions
          </Heading>
          <ProductList
            products={contributedProducts}
            hasNextPage={contributedProductsHasNextPage}
            hasPreviousPage={contributedProductsHasPreviousPage}
            nextCursor={contributedProductsNextCursor}
            previousCursor={contributedProductsPreviousCursor}
            currentCursor={contributedProductsCurrentCursor}
          />
        </Box>
      )}
    </Box>
  );
} 