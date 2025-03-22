import { getSession } from '@/lib/ory';
import type { ExtendedSession } from '@/lib/ory';

export async function SessionProvider({ children }: { children: React.ReactNode }) {
  const session = await getSession() as ExtendedSession;
  
  return (
    <div data-session={JSON.stringify(session)}>
      {children}
    </div>
  );
} 