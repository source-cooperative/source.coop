import React from "react";
import Link from "next/link";
import { Link as ThemeLink } from "theme-ui";

export default function SourceLink({ ...props }) {
  if (props.href) {
    return (
      <Link passHref legacyBehavior href={props.href}>
        <ThemeLink variant={props.variant ? props.variant : "link"} {...props}>
          {props.children}
        </ThemeLink>
      </Link>
    )
  }

  if (props.onClick) {
    return <ThemeLink {...props} />;
  }
}
