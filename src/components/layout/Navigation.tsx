'use client';

import { Logo } from './Logo';
import { Container, Flex, Button, DropdownMenu, Avatar, Text } from '@radix-ui/themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface User {
  account_id: string;
  name: string;
  type: 'individual' | 'organization';
}

// Use the Ory tunnel URL for local development
const KRATOS_URL = 'http://localhost:4000';

export function Navigation() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          // Map Ory session data to our User interface
          setUser({
            account_id: data.identity.id,
            name: data.identity.traits.name || data.identity.traits.email,
            type: 'individual', // Default to individual for now
          });
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      // Use Ory's logout endpoint
      await fetch(`${KRATOS_URL}/self-service/logout/browser`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });
      setUser(null);
      router.push('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <Container>
      <Flex py="4" justify="between" align="center">
        <Logo />
        
        {!isLoading && (
          user ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button variant="ghost" size="2">
                  <Avatar size="2" fallback={user.name[0].toUpperCase()} />
                  <Text ml="2">{user.name}</Text>
                </Button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Content>
                <DropdownMenu.Item asChild>
                  <Link href={`/admin/${user.account_id}`}>Admin</Link>
                </DropdownMenu.Item>
                
                <DropdownMenu.Separator />
                
                <DropdownMenu.Item color="red" onClick={handleLogout}>
                  Log Out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          ) : (
            <Button asChild>
              <Link href="/auth">Log In / Register</Link>
            </Button>
          )
        )}
      </Flex>
    </Container>
  );
} 