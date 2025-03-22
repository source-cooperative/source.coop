'use client';

import { Box, Container, Flex, Button, DropdownMenu, Text } from '@radix-ui/themes';
import Link from 'next/link';
import { useState } from 'react';
import { Logo } from './Logo';
import { ProfileAvatar } from '@/components/features/profiles/ProfileAvatar';
import type { IndividualAccount } from '@/types/account';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import styles from './Navigation.module.css';
import { useSession } from '@/hooks/useAuth';
import { useAccount } from '@/hooks/useAccount';

export function Navigation() {
  const { session } = useSession();
  const { account, isLoading: isAccountLoading } = useAccount();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className={styles.nav}>
      <Container>
        <Flex justify="between" align="center" py="3">
          <Logo />

          <Flex gap="4" align="center">
            {isAccountLoading ? (
              <Text>Loading...</Text>
            ) : account ? (
              <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenu.Trigger>
                  <Flex align="center" gap="2" style={{ cursor: 'pointer' }}>
                    <ProfileAvatar account={account} size="2" />
                    <Text>{account.name}</Text>
                    <ChevronDownIcon className={styles.chevron} data-state={isOpen ? 'open' : 'closed'} />
                  </Flex>
                </DropdownMenu.Trigger>

                <DropdownMenu.Content>
                  <DropdownMenu.Label>Account</DropdownMenu.Label>
                  <DropdownMenu.Item asChild>
                    <Link href={`/${account.account_id}`}>Profile</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link href={`/${account.account_id}/edit`}>Settings</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Label>Organizations</DropdownMenu.Label>
                  <DropdownMenu.Item asChild>
                    <Link href={`/${account.account_id}/organization/new`}>Create Organization</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item color="red" onClick={handleLogout}>
                    Log out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            ) : (
              <Link href="/auth">
                <Button>Log In / Register</Button>
              </Link>
            )}
          </Flex>
        </Flex>
      </Container>
    </nav>
  );
} 