'use client';

import { Avatar } from '@radix-ui/themes';
import md5 from 'md5';
import type { Account } from '@/types/account';
import { useEffect, useState } from 'react';

interface ProfileAvatarProps {
  account: Account;
  size?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
}

export function ProfileAvatar({ account, size = '6' }: ProfileAvatarProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check dark mode on client-side only
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    
    // Optional: Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Get Gravatar URL for individuals, or use organization logo if available
  const getAvatarContent = () => {
    console.log('Account:', account);
    console.log('Is Dark Mode:', isDarkMode);
    
    if (account.type === 'individual' && account.email) {
      const hash = md5(account.email.toLowerCase().trim());
      return { type: 'url', content: `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200` };
    }
    
    // For organizations, check for SVG logo
    if (account.type === 'organization') {
      console.log('Organization logo:', account.logo_svg);
      console.log('Dark mode logo:', account.logo_dark_mode_svg);
      
      const svg = isDarkMode && account.logo_dark_mode_svg 
        ? account.logo_dark_mode_svg 
        : account.logo_svg;
        
      if (svg) {
        console.log('Using SVG:', svg.substring(0, 100) + '...');
        return { type: 'svg', content: svg };
      }
    }
    
    // Fallback to default organization icon
    return { type: 'url', content: 'https://source.coop/images/default-org.png' };
  };

  const avatarContent = getAvatarContent();
  console.log('Avatar content type:', avatarContent.type);

  if (!mounted) {
    return <Avatar size={size} fallback={account.name[0].toUpperCase()} />;
  }

  if (avatarContent.type === 'svg') {
    // Map Radix size to pixels
    const sizeMap = {
      '1': 16,
      '2': 32,
      '3': 48,
      '4': 64,
      '5': 80,
      '6': 96,
      '7': 112,
      '8': 128,
      '9': 144
    };
    const pixelSize = sizeMap[size];
    console.log('Avatar size:', size, 'maps to', pixelSize, 'pixels');
    
    return (
      <div 
        style={{
          width: `${pixelSize}px`,
          height: `${pixelSize}px`,
          borderRadius: account.type === 'individual' ? '100%' : 'var(--radius-4)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--gray-3)',
          padding: '4px',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          dangerouslySetInnerHTML={{ 
            __html: avatarContent.content.replace(
              '<svg',
              `<svg style="width: 100%; height: 100%; display: block;"`
            )
          }}
        />
      </div>
    );
  }

  return (
    <Avatar
      size={size}
      src={avatarContent.content}
      fallback={account.name[0].toUpperCase()}
      radius={account.type === 'individual' ? 'full' : 'medium'}
    />
  );
} 