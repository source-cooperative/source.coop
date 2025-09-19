import { Box, Text, Link as RadixLink, Flex } from "@radix-ui/themes";
import Link from "next/link";
import type { IndividualAccount } from "@/types";
import { ProfileAvatar } from "./ProfileAvatar";
import { accountUrl } from "@/lib/urls";

interface OrganizationMembersProps {
  owners: IndividualAccount[];
  admins: IndividualAccount[];
  members: IndividualAccount[];
}

export function OrganizationMembers({
  owners,
  admins,
  members,
}: OrganizationMembersProps) {
  // Calculate total to show
  const totalMembers = owners.length + admins.length + members.length;

  // If no members to show, display a message
  if (totalMembers === 0) {
    return (
      <Text size="2" color="gray">
        No members to display
      </Text>
    );
  }

  // Create a set to track unique account IDs to prevent duplicates
  const processedAccounts = new Set<string>();

  // Ensure each account appears only once by filtering out duplicates
  const uniqueAdmins = admins.filter((admin) => {
    if (processedAccounts.has(admin.account_id)) return false;
    processedAccounts.add(admin.account_id);
    return true;
  });

  const uniqueMembers = members.filter((member) => {
    if (processedAccounts.has(member.account_id)) return false;
    processedAccounts.add(member.account_id);
    return true;
  });

  // Group members by role for cleaner display
  const memberGroups = [
    { role: "owner", title: "Owners", members: owners },
    { role: "admin", title: "Administrators", members: uniqueAdmins },
    { role: "member", title: "Members", members: uniqueMembers },
  ].filter((group) => group.members.length > 0);

  return (
    <Flex direction="column" gap="3">
      {memberGroups.map((group) => (
        <Box key={group.role}>
          <Text as="p" size="2" weight="bold" mb="1">
            {group.title}
          </Text>
          <Flex direction="column" gap="1">
            {group.members.map((member) => (
              <MemberLink
                key={member.account_id}
                member={member}
                role={group.role as "owner" | "admin" | "member"}
              />
            ))}
          </Flex>
        </Box>
      ))}
    </Flex>
  );
}

interface MemberLinkProps {
  member: IndividualAccount;
  role: "owner" | "admin" | "member";
}

function MemberLink({ member, role: _role }: MemberLinkProps) {
  return (
    <RadixLink asChild>
      <Link href={accountUrl(member.account_id)}>
        <Flex gap="2" align="center">
          <ProfileAvatar account={member} size="2" />
          <Text size="2">{member.name}</Text>
        </Flex>
      </Link>
    </RadixLink>
  );
}
