import { IconButton } from "@radix-ui/themes";
import Link from "next/link";
import { GearIcon } from "@radix-ui/react-icons";

interface EditButtonProps {
  href: string;
  variant?: "solid" | "soft" | "outline" | "ghost";
  size?: "1" | "2" | "3" | "4";
  children?: React.ReactNode;
}

export function EditButton({
  href,
  variant = "ghost",
  size = "2",
  children = <GearIcon width="18" height="18" xlinkTitle="Edit" />,
}: EditButtonProps) {
  return (
    <Link href={href}>
      <IconButton variant={variant} size={size}>
        {children}
      </IconButton>
    </Link>
  );
}
