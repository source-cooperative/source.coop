import { Link, Flex } from "@radix-ui/themes";
import {
  Link2Icon,
  GitHubLogoIcon,
  LinkedInLogoIcon,
} from "@radix-ui/react-icons";

interface WebsiteLinkProps {
  url: string;
}

// Icons are flex children; without this a long URL squeezes them to nothing.
const iconProps = {
  width: "16",
  height: "16",
  style: { flexShrink: 0 },
} as const;

function getIcon(url: string) {
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes("github.com")) {
    return <GitHubLogoIcon {...iconProps} />;
  }

  if (hostname.includes("linkedin.com")) {
    return <LinkedInLogoIcon {...iconProps} />;
  }

  return <Link2Icon {...iconProps} />;
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
        style={{ wordBreak: "break-all", minWidth: 0 }}
      >
        {url}
      </Link>
    </Flex>
  );
}
