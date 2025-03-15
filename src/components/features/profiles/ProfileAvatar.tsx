import { Avatar } from '@radix-ui/themes';
import md5 from 'md5';
import type { Account } from '@/types/account';

interface ProfileAvatarProps {
  account: Account;
  size?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
}

export function ProfileAvatar({ account, size = '3' }: ProfileAvatarProps) {
  // Get Gravatar URL for individuals, or use organization logo URL if available
  const getAvatarUrl = () => {
    if (account.type === 'individual' && account.email) {
      const hash = md5(account.email.toLowerCase().trim());
      return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
    }
    // For organizations, we could add a logo_url field to the Account type
    // For now, use a default organization icon
    return 'https://source.coop/images/default-org.png';
  };

  return (
    <Avatar
      size={size}
      src={getAvatarUrl()}
      fallback={account.name[0].toUpperCase()}
      radius={account.type === 'individual' ? 'full' : 'medium'}
    />
  );
} 