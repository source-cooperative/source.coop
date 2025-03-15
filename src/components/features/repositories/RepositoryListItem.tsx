'use client';

// For homepage and general listing
import { Card, Text, Flex } from '@radix-ui/themes';
import Link from 'next/link';
import { forwardRef } from 'react';
import type { Repository, Account } from '@/types';
import { DateText } from '@/components/display';
import { MonoText } from '@/components/core';
import styled from '@emotion/styled';

interface RepositoryListItemProps {
  repository: Repository;
  account?: Account;
  isFocused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

const StyledLink = styled(Link)`
  text-decoration: none;
  display: block;
  padding: var(--space-2);
  border-radius: var(--radius-2);
  transition: background-color 0.2s ease;
  outline: none;

  &:focus {
    background-color: var(--accent-4);
    outline: 2px solid var(--accent-8);
    outline-offset: -2px;
  }

  &:hover:not(:focus) {
    background-color: var(--accent-3);
  }
`;

const StyledCard = styled(Card)`
  margin-bottom: var(--space-2);
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: transparent;
  }
`;

export const RepositoryListItem = forwardRef<HTMLAnchorElement, RepositoryListItemProps>(
  function RepositoryListItem({ repository, account, isFocused, onFocus, onBlur }, ref) {
    return (
      <StyledLink
        href={`/${repository.account.account_id}/${repository.repository_id}`}
        ref={ref}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          display: 'block',
          marginBottom: '8px',
          textDecoration: 'none',
          outline: isFocused ? '2px solid var(--accent-8)' : 'none',
          borderRadius: 'var(--radius-3)',
          padding: '2px'
        }}
      >
        <StyledCard
          style={{
            backgroundColor: isFocused ? 'var(--accent-4)' : undefined,
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isFocused) {
              (e.target as HTMLElement).style.backgroundColor = 
                document.documentElement.classList.contains('dark') 
                  ? 'var(--gray-4)' 
                  : 'var(--gray-3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isFocused) {
              (e.target as HTMLElement).style.backgroundColor = '';
            }
          }}
        >
          <Flex direction="column" gap="1">
            <Text size="5" weight="bold">
              {repository.title}
            </Text>
            {repository.description && (
              <Text color="gray" size="4">
                {repository.description}
              </Text>
            )}
            <Text color="gray" size="3">
              Last updated <DateText date={repository.updated_at} />
            </Text>
          </Flex>
        </StyledCard>
      </StyledLink>
    );
  }
); 