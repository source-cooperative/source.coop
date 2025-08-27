import {
  Box,
  Text,
  Grid,
  Heading,
  Flex,
  Link as RadixLink,
  Table,
  IconButton,
  Tooltip,
} from "@radix-ui/themes";
import { CopyIcon, CheckIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import type {
  IndividualAccount,
  OrganizationalAccount,
  Product,
  APIKey,
} from "@/types";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProductsList } from "../products/ProductsList";
import { WebsiteLink } from "./WebsiteLink";
import { EmailVerificationStatus } from "./EmailVerificationStatus";
import { IndividualProfileActions } from "./IndividualProfileActions";
import { MonoText } from "@/components/core";
import { useState } from "react";

interface IndividualProfileProps {
  account: IndividualAccount;
  ownedProducts: Product[];
  contributedProducts: Product[];
  organizations: OrganizationalAccount[];
  showWelcome?: boolean;
  accessKeys?: APIKey[];
}

export function IndividualProfile({
  account,
  ownedProducts,
  contributedProducts,
  organizations,
  showWelcome = false,
  accessKeys = [],
}: IndividualProfileProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

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

      <Box mb="6">
        <Heading size="4" mb="2">
          Access Keys (legacy)
        </Heading>
                 {accessKeys.length > 0 ? (
           <Table.Root variant="surface">
             <Table.Header>
               <Table.Row>
                 <Table.ColumnHeaderCell>Account</Table.ColumnHeaderCell>
                 <Table.ColumnHeaderCell>Product</Table.ColumnHeaderCell>
                 <Table.ColumnHeaderCell>Key</Table.ColumnHeaderCell>
               </Table.Row>
             </Table.Header>
             <Table.Body>
               {accessKeys.map((key) => (
                 <Table.Row key={key.access_key_id}>
                   <Table.Cell>
                     <RadixLink asChild>
                       <Link href={`/${key.account_id}`}>
                         {key.account_id}
                       </Link>
                     </RadixLink>
                   </Table.Cell>
                   <Table.Cell>
                     {key.repository_id ? (
                       <RadixLink asChild>
                         <Link href={`/${key.account_id}/${key.repository_id}`}>
                           {key.repository_id}
                         </Link>
                       </RadixLink>
                     ) : (
                       <Text color="gray">-</Text>
                     )}
                   </Table.Cell>
                   <Table.Cell>
                     <Flex align="center" gap="2">
                       <MonoText>{key.access_key_id}</MonoText>
                       <Tooltip content="Copy to clipboard">
                         <IconButton
                           size="1"
                           variant="ghost"
                           color={copiedKey === key.access_key_id ? "green" : "gray"}
                           onClick={() => copyToClipboard(key.access_key_id, key.access_key_id)}
                           aria-label={`Copy ${key.access_key_id}`}
                         >
                           {copiedKey === key.access_key_id ? <CheckIcon /> : <CopyIcon />}
                         </IconButton>
                       </Tooltip>
                     </Flex>
                   </Table.Cell>
                 </Table.Row>
               ))}
             </Table.Body>
           </Table.Root>
         ) : (
           <Text>No access keys found.</Text>
         )}
      </Box>

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
