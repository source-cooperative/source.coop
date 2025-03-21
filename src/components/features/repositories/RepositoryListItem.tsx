'use client';

// For homepage and general listing
import { forwardRef } from 'react';
import Link from 'next/link';
import type { Repository } from '@/types';
import { DateText } from '@/components/display';
import { Box, Text, Badge, Heading } from '@radix-ui/themes';
import styles from './RepositoryList.module.css';

interface RepositoryListItemProps {
  repository: Repository;
  isSelected?: boolean;
}

export const RepositoryListItem = forwardRef<HTMLAnchorElement, RepositoryListItemProps>(
  function RepositoryListItem({ repository, isSelected }, ref) {
    return (
      <Link 
        href={`/${repository.account.account_id}/${repository.repository_id}`}
        className={styles.item}
        data-selected={isSelected}
        ref={ref}
        aria-current={isSelected ? 'page' : undefined}
      >
        <Box asChild>
          <article>
            <Heading size="5" weight="bold" color="gray" mb="2">
              {repository.title}
            </Heading>
              
            {repository.description && (
              <Text as="p" size="2" color="gray" mb="4">
                {repository.description}
              </Text>
            )}

            <Box>
              <Text size="1" color="gray" mb="2">
                {repository.account.name}
              </Text>
              <Text size="1" color="gray" mb="2">
                Updated <DateText date={repository.updated_at} />
              </Text>
              <Badge 
                size="1" 
                color={repository.private ? "red" : "green"}
                aria-label={repository.private ? "Private repository" : "Public repository"}
              >
                {repository.private ? "Private" : "Public"}
              </Badge>
            </Box>
          </article>
        </Box>
      </Link>
    );
  }
); 