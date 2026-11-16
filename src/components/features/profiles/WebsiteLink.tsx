import { Link, Flex } from "@radix-ui/themes";
import {
  Link2Icon,
  GitHubLogoIcon,
  LinkedInLogoIcon,
} from "@radix-ui/react-icons";
import { formatUrl } from "@/lib/format";

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
  const href = url.startsWith("http") ? url : `https://${url}`;
  return (
    <Flex gap="2" align="center">
      {getIcon(href)}
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        underline="always"
        title={href}
        // formatUrl's budget guesses at the column width; truncate is the
        // backstop when the guess is generous. It only bites because the link
        // is a direct flex child: Radix resets the <a> to display:inline, where
        // overflow does not apply, and flex blockifies it. Don't wrap it in a
        // Box without reproducing a minWidth:0 chain.
        truncate
        style={{ minWidth: 0 }}
      >
        {formatUrl(href)}
      </Link>
    </Flex>
  );
}
