'use client';

// For homepage and general listing
import { forwardRef } from 'react';
import Link from 'next/link';
import type { Repository_v2 } from '@/types/repository_v2';
import { DateText } from '@/components/display';
import { Box, Text, Badge, Heading } from '@radix-ui/themes';
import styles from './RepositoryList.module.css';

interface RepositoryListItemProps {
  repository: Repository_v2;
  isSelected?: boolean;
}

export const RepositoryListItem = forwardRef<HTMLAnchorElement, RepositoryListItemProps>(
  function RepositoryListItem({ repository, isSelected }, ref) {
    return (
      <Link 
        href={`/${repository.account_id}/${repository.repository_id}`}
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
              {repository.account?.name && (
                <Text size="1" color="gray" mb="2">
                  {repository.account.name}
                </Text>
              )}
              <Text size="1" color="gray" mb="2">
                Updated <DateText date={repository.updated_at} />
              </Text>
              <Badge 
                size="1" 
                color={
                  repository.visibility === 'public' ? "green" : 
                  repository.visibility === 'unlisted' ? "yellow" : 
                  "red"
                }
                aria-label={
                  repository.visibility === 'public' ? "Public repository" : 
                  repository.visibility === 'unlisted' ? "Unlisted repository" : 
                  "Restricted repository"
                }
              >
                {repository.visibility === 'public' ? "Public" : 
                 repository.visibility === 'unlisted' ? "Unlisted" : 
                 "Restricted"}
              </Badge>
            </Box>
          </article>
        </Box>
      </Link>
    );
  }
); 