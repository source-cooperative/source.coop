import { ReactNode } from "react";
import { Heading } from "@radix-ui/themes";
import { Link2Icon } from "@radix-ui/react-icons";
import type { HeadingProps } from "@radix-ui/themes/dist/cjs/components/heading";

interface HeadingWithPermalinkProps {
  id: string;
  level: HeadingProps["size"];
  children: ReactNode;
  mb?: HeadingProps["mb"];
}

export function HeadingWithPermalink({
  id,
  level,
  children,
  mb,
}: HeadingWithPermalinkProps) {
  return (
    <Heading size={level} mb={mb} id={id} className="heading-with-permalink">
      {children}
      <a href={`#${id}`} className="permalink-link" aria-label="Permalink">
        <Link2Icon />
      </a>
    </Heading>
  );
}
