import { Link, Flex } from '@radix-ui/themes';
import { Link2Icon, GitHubLogoIcon, LinkedInLogoIcon } from '@radix-ui/react-icons';

interface WebsiteLinkProps {
  website: {
    url: string;
  };
}

export function WebsiteLink({ website }: WebsiteLinkProps) {
  const getIcon = (url: string) => {
    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('github.com')) {
      return <GitHubLogoIcon width="16" height="16" />;
    }
    
    if (hostname.includes('linkedin.com')) {
      return <LinkedInLogoIcon width="16" height="16" />;
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