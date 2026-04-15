import { ReactNode } from "react";
import { Heading } from "@radix-ui/themes";
import { Link2Icon } from "@radix-ui/react-icons";

interface HeadingWithPermalinkProps {
  id: string;
  level: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
  children: ReactNode;
  mb?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
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
