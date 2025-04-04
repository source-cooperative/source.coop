'use client';

import { Avatar } from '@radix-ui/themes';
import md5 from 'md5';
import type { Account } from '@/types/account_v2';

interface ProfileAvatarProps {
  account: Account;
  size?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
}

export function ProfileAvatar({ account, size = '6' }: ProfileAvatarProps) {
  // Get avatar source URL
  const getAvatarSrc = () => {
    if (account.type === 'individual') {
      // Use Gravatar for individuals
      const primaryEmail = account.emails?.find(
        (email) => email.is_primary
      )?.address;
      if (primaryEmail) {
        const hash = md5(primaryEmail.toLowerCase().trim());
        return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
      }
    }
    
    // Use default organization icon for organizations
    return 'https://source.coop/images/default-org.png';
  };

  return (
    <Avatar
      size={size}
      src={getAvatarSrc()}
      fallback={account.name[0].toUpperCase()}
      radius={account.type === 'individual' ? 'full' : 'medium'}
    />
  );
} 