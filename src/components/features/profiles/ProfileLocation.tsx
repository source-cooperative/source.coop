import { Flex } from "@radix-ui/themes";
import { GlobeIcon } from "@radix-ui/react-icons";

interface ProfileLocationProps {
  location: string;
}

export function ProfileLocation({ location }: ProfileLocationProps) {
  return (
    <Flex gap="2" align="center">
      <GlobeIcon width="16" height="16" />
      {location}
    </Flex>
  );
}
