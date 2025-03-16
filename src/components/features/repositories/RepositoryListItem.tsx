'use client';

// For homepage and general listing
import { forwardRef } from 'react';
import Link from 'next/link';
import type { Repository } from '@/types';
import { DateText } from '@/components/display';
import { Box, Text, Flex, Badge, Heading } from '@radix-ui/themes';
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
        data-highlighted={isSelected}
        data-selected={isSelected}
        ref={ref}
      >
        <Box asChild>
          <article>
            <Box mb="2">
              <Heading size="5" weight="bold" color="gray">
                {repository.title}
              </Heading>
            </Box>
            
            {repository.description && (
              <Box mb="4">
                <Text as="p" size="2" color="gray">
                  {repository.description}
                </Text>
              </Box>
            )}

            <Flex gap="3" align="center">
              <Text size="1" color="gray">
                Updated <DateText date={repository.updated_at} />
              </Text>
              <Text size="1" color="gray">
                {repository.account.name}
              </Text>
              <Badge 
                size="1" 
                color={repository.private ? "red" : "green"}
              >
                {repository.private ? "Private" : "Public"}
              </Badge>
            </Flex>
          </article>
        </Box>
      </Link>
    );
  }
); 