'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navigation.module.css';

interface LogoLinkProps {
  children: React.ReactNode;
}

export function LogoLink({ children }: LogoLinkProps) {
  const pathname = usePathname();
  
  // Only wrap in Link if not on home page
  return pathname === '/' ? (
    <div className={styles.logo}>{children}</div>
  ) : (
    <Link href="/" className={styles.logo}>{children}</Link>
  );
} 