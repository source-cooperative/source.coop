'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LogoLinkProps {
  children: React.ReactNode;
}

export function LogoLink({ children }: LogoLinkProps) {
  const pathname = usePathname();
  
  const logoStyle = {
    textDecoration: "none",
    color: "inherit"
  };
  
  // Only wrap in Link if not on home page
  return pathname === '/' ? (
    <div style={logoStyle}>{children}</div>
  ) : (
    <Link href="/" style={logoStyle}>{children}</Link>
  );
} 