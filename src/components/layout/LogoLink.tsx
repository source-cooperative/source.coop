'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LogoLinkProps {
  children: React.ReactNode;
}

export function LogoLink({ children }: LogoLinkProps) {
  const pathname = usePathname();
  
  // Only wrap in Link if not on home page
  return pathname === '/' ? children : <Link href="/">{children}</Link>;
} 