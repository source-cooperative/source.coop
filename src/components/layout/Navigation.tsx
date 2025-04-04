'use client';

import { Container, Flex, Button, DropdownMenu, Text } from '@radix-ui/themes';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { ProfileAvatar } from '@/components/features/profiles/ProfileAvatar';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import styles from './Navigation.module.css';
import { useAccount } from '@/hooks/useAccount';
import { useAuth } from '@/hooks/useAuth';
import { ory } from '@/lib/ory';
import { Session, Identity } from '@ory/client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface NavigationProps {
  initialSession?: {
    identity?: {
      metadata_public?: {
        account_id?: string;
        is_admin?: boolean;
      };
    };
  } | null;
}

interface ExtendedIdentity extends Identity {
  metadata_public?: {
    account_id?: string;
    is_admin?: boolean;
  };
}

interface ExtendedSession extends Session {
  identity?: ExtendedIdentity;
}

export function Navigation(props: NavigationProps) {
  const { session, isLoading: isSessionLoading } = useAuth();
  const accountId = session?.identity?.metadata_public?.account_id;
  const [isOpen, setIsOpen] = useState(false);
  const [directSession, setDirectSession] = useState<ExtendedSession | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Extract account ID from either the useAuth hook or direct session
  const effectiveAccountId = accountId || directSession?.identity?.metadata_public?.account_id;
  
  // Only fetch account when we have a valid account ID
  const { account, isLoading: isAccountLoading, refresh: refreshAccount } = useAccount(effectiveAccountId);
  
  // Detect navigation changes (including after login redirect)
  useEffect(() => {
    // Check if we just completed a login flow (Ory often redirects with these params)
    const isAuthRedirect = 
      searchParams.has('flow') || 
      searchParams.has('return_to') || 
      searchParams.has('after_verification_return_to');
    
    console.log('Navigation: URL changed', { 
      pathname, 
      searchParams: searchParams.toString(),
      isAuthRedirect
    });
    
    // Always update the refresh trigger to check session
    setRefreshTrigger(prev => prev + 1);
    
    // After login, we need to force account refresh
    if (refreshAccount) {
      refreshAccount();
    }
  }, [pathname, searchParams, refreshAccount]);
  
  // Direct check with Ory SDK
  useEffect(() => {
    ory.toSession()
      .then(({ data }) => {
        console.log('Direct Ory session check:', data);
        setDirectSession(data as ExtendedSession);
      })
      .catch(error => {
        if (!(error instanceof Error && error.message.includes('401'))) {
          console.error('Direct Ory session check error:', error);
        }
      });
  }, [refreshTrigger]);

  const handleLogout = async () => {
    try {
      // Use Ory SDK directly as recommended in the CURSOR_RULES
      const { data } = await ory.createBrowserLogoutFlow();
      
      if (data.logout_url) {
        window.location.href = data.logout_url;
      } else {
        throw new Error('No logout URL returned from Ory');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Loading state
  if ((isSessionLoading && !directSession) || isAccountLoading) {
    return (
      <nav className={styles.nav}>
        <Container>
          <Flex justify="between" align="center" py="3">
            <Logo />
            <Text>Loading...</Text>
          </Flex>
        </Container>
      </nav>
    );
  }

  return (
    <nav className={styles.nav}>
      <Container>
        <Flex justify="between" align="center" py="3">
          <Logo />

          <Flex gap="4" align="center">
            {account ? (
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
                  <DropdownMenu.Item>
                    <Link href={`/${account.account_id}`}>View Profile</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item>
                    <Link href={`/${account.account_id}/edit`}>Edit Profile</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Label>Organizations</DropdownMenu.Label>
                  <DropdownMenu.Item>
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