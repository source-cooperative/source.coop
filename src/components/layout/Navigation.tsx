'use client';

import { Box, Container, Flex, Button, DropdownMenu, Avatar, Text } from '@radix-ui/themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Logo } from '../core/Logo';
import { ProfileAvatar } from '@/components/features/profiles/ProfileAvatar';
import type { IndividualAccount } from '@/types/account';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import styles from './Navigation.module.css';

// Use the Ory tunnel URL for local development
const KRATOS_URL = process.env.NEXT_PUBLIC_KRATOS_URL || 'http://localhost:4000';

export function Navigation() {
  const router = useRouter();
  const [user, setUser] = useState<IndividualAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(`${KRATOS_URL}/sessions/whoami`, {
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Get the account_id from the user's metadata
          const accountId = data.identity.metadata_public?.account_id;
          if (accountId) {
            // Fetch the account details from our database
            const accountResponse = await fetch(`/api/accounts/${accountId}`);
            if (accountResponse.ok) {
              const account = await accountResponse.json();
              setUser(account);
            }
          }
        } else {
          // Not logged in - this is an expected state
          setUser(null);
        }
      } catch (error) {
        // Network or other error - log but don't throw
        console.error('Error checking session:', error);
        setUser(null);
        // Don't set error state for connection issues - just treat as not logged in
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch(`${KRATOS_URL}/self-service/logout/browser`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.logout_url;
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
                <Button>Register / Log in</Button>
              </Link>
            )}
          </Flex>
        </Flex>
      </Container>
    </nav>
  );
} 