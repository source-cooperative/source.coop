import { Link, Text, Flex } from '@radix-ui/themes';
import { Github, Linkedin } from 'lucide-react';
import { Link2Icon } from '@radix-ui/react-icons';
import { Website } from '@/types/account';

interface WebsiteLinkProps {
  website: Website;
}

export function WebsiteLink({ website }: WebsiteLinkProps) {
  const getIcon = (url: string) => {
    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('github.com')) {
      return <Github className="h-4 w-4" />;
    }
    
    if (hostname.includes('linkedin.com')) {
      return <Linkedin className="h-4 w-4" />;
    }
    
    return <Link2Icon width="16" height="16" />;
  };

  return (
    <Flex gap="2" align="center">
      {getIcon(website.url)}
      <Link href={website.url} target="_blank" rel="noopener noreferrer" underline="always">
        {website.url}
      </Link>
    </Flex>
  );
} 