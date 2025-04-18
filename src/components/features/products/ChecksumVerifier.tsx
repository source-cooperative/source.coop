'use client';

import { useState } from 'react';
import { Text, Flex, Button, Box } from '@radix-ui/themes';
import { CheckCircledIcon, CrossCircledIcon, UpdateIcon } from '@radix-ui/react-icons';

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
        setError('Checksum not available in response headers');
        setStatus('error');
        return;
      }

      setStatus(headerHash.toLowerCase() === expectedHash.toLowerCase() ? 'match' : 'mismatch');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify checksum');
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
        Verify {algorithm}
      </Button>
      {status === 'checking' && (
        <Flex align="center" gap="1">
          <UpdateIcon className="animate-spin" />
          <Text size="1">Verifying...</Text>
        </Flex>
      )}
      {status === 'match' && (
        <Flex align="center" gap="1">
          <Box style={{ color: 'var(--green-9)' }}>
            <CheckCircledIcon />
          </Box>
          <Text size="1" color="green">Checksum verified</Text>
        </Flex>
      )}
      {status === 'mismatch' && (
        <Flex align="center" gap="1">
          <Box style={{ color: 'var(--red-9)' }}>
            <CrossCircledIcon />
          </Box>
          <Text size="1" color="red">Checksum mismatch</Text>
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