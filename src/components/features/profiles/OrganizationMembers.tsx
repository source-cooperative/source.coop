import { Box, Text, Avatar, Link as RadixLink, Flex } from '@radix-ui/themes';
import Link from 'next/link';
import type { IndividualAccount } from '@/types';

interface OrganizationMembersProps {
  owner: IndividualAccount | null;
  admins: IndividualAccount[];
  members: IndividualAccount[];
}

export function OrganizationMembers({ owner, admins, members }: OrganizationMembersProps) {
  // Calculate total to show
  const totalMembers = (owner ? 1 : 0) + admins.length + members.length;
  
  // If no members to show, display a message
  if (totalMembers === 0) {
    return <Text size="2" color="gray">No members to display</Text>;
  }

  // Create a set to track unique account IDs to prevent duplicates
  const processedAccounts = new Set<string>();
  
  // Ensure each account appears only once by filtering out duplicates
  const uniqueAdmins = admins.filter(admin => {
    if (processedAccounts.has(admin.account_id)) return false;
    processedAccounts.add(admin.account_id);
    return true;
  });
  
  const uniqueMembers = members.filter(member => {
    if (processedAccounts.has(member.account_id)) return false;
    processedAccounts.add(member.account_id);
    return true;
  });

  // Group members by role for cleaner display
  const memberGroups = [
    { role: 'owner', title: 'Owner', members: owner ? [owner] : [] },
    { role: 'admin', title: 'Administrators', members: uniqueAdmins },
    { role: 'member', title: 'Members', members: uniqueMembers }
  ].filter(group => group.members.length > 0);

  return (
    <Flex direction="column" gap="3">
      {memberGroups.map(group => (
        <Box key={group.role}>
          <Text as="p" size="2" weight="bold" mb="1">{group.title}</Text>
          <Flex direction="column" gap="1">
            {group.members.map(member => (
              <MemberLink 
                key={`${group.role}-${member.account_id}`} 
                member={member} 
                role={group.role as 'owner' | 'admin' | 'member'} 
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
  role: 'owner' | 'admin' | 'member';
}

function MemberLink({ member, role }: MemberLinkProps) {
  return (
    <Link href={`/${member.account_id}`} passHref legacyBehavior>
      <RadixLink size="2">
        <Flex gap="2" align="center">
          <Avatar
            size="1"
            src={member.logo_svg}
            fallback={member.name[0]}
            radius="full"
          />
          <Text>{member.name}</Text>
          {role !== 'member' && (
            <Text size="1" color="gray">({role})</Text>
          )}
        </Flex>
      </RadixLink>
    </Link>
  );
} 