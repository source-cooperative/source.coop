import {
  Box,
  Text,
  Grid,
  Heading,
  Flex,
  Link as RadixLink,
} from "@radix-ui/themes";
import type {
  IndividualAccount,
  OrganizationalAccount,
  Product,
} from "@/types";
import { editAccountProfileUrl } from "@/lib/urls";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProductsList } from "../products/ProductsList";
import { WebsiteLink } from "./WebsiteLink";
import { EmailVerificationStatus } from "./EmailVerificationStatus";
import { AvatarLinkCompact, EditButton } from "@/components/core";
import { EmailVerificationCallout } from "../auth/EmailVerificationCallout";
import { WelcomeCallout } from "./WelcomeCallout";

interface IndividualProfileProps {
  account: IndividualAccount;
  isOwner: boolean; // Whether the current user is the owner of the account
  ownedProducts: Product[];
  contributedProducts: Product[];
  organizations: OrganizationalAccount[];
  showWelcome?: boolean;
  canEdit: boolean;
}

export function IndividualProfile({
  account,
  isOwner,
  ownedProducts,
  contributedProducts,
  organizations,
  showWelcome = false,
  canEdit,
}: IndividualProfileProps) {
  const primaryEmail = account.emails?.find((email) => email.is_primary);
  return (
    <Box>
      {isOwner && (
        <>
          {!primaryEmail?.verified && <EmailVerificationCallout />}
          {showWelcome && <WelcomeCallout accountId={account.account_id} />}
        </>
      )}

      <Box mb="6">
        <Flex gap="4" align="center" justify="between">
          <Flex gap="4" align="center">
            <ProfileAvatar account={account} size="6" />
            <Box>
              <Flex gap="2" align="center">
                <Heading size="8">{account.name}</Heading>
                <EmailVerificationStatus email={primaryEmail} />
              </Flex>
              {account.metadata_public.bio && (
                <Text size="3" color="gray">
                  {account.metadata_public.bio}
                </Text>
              )}
            </Box>
          </Flex>
          {canEdit && (
            <EditButton href={editAccountProfileUrl(account.account_id)} />
          )}
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
                  <Box key={index} mb="2">
                    <WebsiteLink url={domain.domain} />
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
              <AvatarLinkCompact account={org} key={org.account_id} />
            ))}
          </Grid>
        </Box>
      )}

      {ownedProducts.length > 0 && (
        <Box mb="6">
          <Heading size="4" mb="2">
            Products
          </Heading>
          <ProductsList products={ownedProducts} />
        </Box>
      )}

      {contributedProducts.length > 0 && (
        <Box>
          <Heading size="4" mb="2">
            Contributions
          </Heading>
          <ProductsList products={contributedProducts} />
        </Box>
      )}
    </Box>
  );
}
