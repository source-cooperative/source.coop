'use client';

import { useState } from 'react';
import { Text, Flex, Button, Box } from '@radix-ui/themes';
import { CheckCircledIcon, CrossCircledIcon, UpdateIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';

interface ChecksumVerifierProps {
  objectUrl: string;
  expectedHash: string;
  algorithm: 'SHA-256' | 'SHA-1';
}

export function ChecksumVerifier({ 
  objectUrl, 
  expectedHash, 
  algorithm
}: ChecksumVerifierProps) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'match' | 'mismatch' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('ChecksumVerifier');

  async function verifyChecksum() {
    try {
      setStatus('checking');
      setError(null);

      // Make HEAD request to get metadata
      const response = await fetch(objectUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get checksum from response headers
      const headerHash = response.headers.get(algorithm === 'SHA-256' ? 'x-amz-checksum-sha256' : 'x-amz-checksum-sha1');
      
      if (!headerHash) {
        setError(t('notAvailable'));
        setStatus('error');
        return;
      }

      setStatus(headerHash.toLowerCase() === expectedHash.toLowerCase() ? 'match' : 'mismatch');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failed'));
      setStatus('error');
    }
  }

  return (
    <Flex align="center" gap="2">
      <Button 
        size="1" 
        onClick={verifyChecksum}
        disabled={status === 'checking'}
      >
        {t('verify', { algorithm })}
      </Button>
      {status === 'checking' && (
        <Flex align="center" gap="1">
          <UpdateIcon className="animate-spin" />
          <Text size="1">{t('verifying')}</Text>
        </Flex>
      )}
      {status === 'match' && (
        <Flex align="center" gap="1">
          <Box style={{ color: 'var(--green-9)' }}>
            <CheckCircledIcon />
          </Box>
          <Text size="1" color="green">{t('verified')}</Text>
        </Flex>
      )}
      {status === 'mismatch' && (
        <Flex align="center" gap="1">
          <Box style={{ color: 'var(--red-9)' }}>
            <CrossCircledIcon />
          </Box>
          <Text size="1" color="red">{t('mismatch')}</Text>
        </Flex>
      )}
      {status === 'error' && (
        <Text size="1" color="red" style={{ maxWidth: '400px' }}>
          {error}
        </Text>
      )}
    </Flex>
  );
} 