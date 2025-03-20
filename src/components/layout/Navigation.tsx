'use client';

import { Box, Container, Flex, Button, DropdownMenu, Text } from '@radix-ui/themes';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Logo } from '../core/Logo';
import { ProfileAvatar } from '@/components/features/profiles/ProfileAvatar';
import type { IndividualAccount } from '@/types/account';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import styles from './Navigation.module.css';
import { getSession } from '@/lib/auth';

export function Navigation() {
  const [user, setUser] = useState<IndividualAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getSession();
        
        if (session?.identity?.metadata_public?.account_id) {
          const accountId = session.identity.metadata_public.account_id;
          // Fetch user account details
          const response = await fetch(`/api/accounts/${accountId}`);
          if (response.ok) {
            const account = await response.json();
            setUser(account);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

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