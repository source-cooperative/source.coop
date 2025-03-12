import { LinkCard } from './common/LinkCard';
import type { Account } from '@/types/account';
import { Text } from '@radix-ui/themes';

export function AccountList({ accounts }: { accounts: Account[] }) {
  return (
    <div>
      {accounts.map((account) => (
        <LinkCard 
          key={account.account_id}
          href={`/accounts/${account.account_id}`}
          title={account.name}
        >
          <Text>{account.type || 'No description available'}</Text>
        </LinkCard>
      ))}
    </div>
  );
} 