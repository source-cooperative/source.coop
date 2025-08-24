import { Link, Flex } from "@radix-ui/themes";
import {
  Link2Icon,
  GitHubLogoIcon,
  LinkedInLogoIcon,
} from "@radix-ui/react-icons";

interface WebsiteLinkProps {
  url: string;
}

function getIcon(url: string) {
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes("github.com")) {
    return <GitHubLogoIcon width="16" height="16" />;
  }

  if (hostname.includes("linkedin.com")) {
    return <LinkedInLogoIcon width="16" height="16" />;
  }

  return <Link2Icon width="16" height="16" />;
}

export function WebsiteLink({ url }: WebsiteLinkProps) {
  url = url.startsWith("http") ? url : `https://${url}`;
  return (
    <Flex gap="2" align="center">
      {getIcon(url)}
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        underline="always"
      >
        {url}
      </Link>
    </Flex>
  );
}
