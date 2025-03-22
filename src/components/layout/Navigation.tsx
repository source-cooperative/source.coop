'use client';

import { Box, Container, Flex, Button, DropdownMenu, Text } from '@radix-ui/themes';
import Link from 'next/link';
import { useState } from 'react';
import { Logo } from './Logo';
import { ProfileAvatar } from '@/components/features/profiles/ProfileAvatar';
import type { IndividualAccount } from '@/types/account';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import styles from './Navigation.module.css';
import { useSession } from '@/hooks/useSession';

export function Navigation() {
  const { session, isLoading } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const user = session?.identity?.traits as IndividualAccount | null;

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
            {isLoading ? (
              <Text>Loading...</Text>
            ) : user ? (
              <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenu.Trigger>
                  <Flex align="center" gap="2" style={{ cursor: 'pointer' }}>
                    <ProfileAvatar account={user} size="2" />
                    <Text>{user.name}</Text>
                    <ChevronDownIcon />
                  </Flex>
                </DropdownMenu.Trigger>

                <DropdownMenu.Content>
                  <DropdownMenu.Label>Account</DropdownMenu.Label>
                  <DropdownMenu.Item asChild>
                    <Link href={`/${user.account_id}`}>Profile</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link href={`/${user.account_id}/edit`}>Settings</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Label>Organizations</DropdownMenu.Label>
                  <DropdownMenu.Item asChild>
                    <Link href={`/${user.account_id}/organization/new`}>Create Organization</Link>
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