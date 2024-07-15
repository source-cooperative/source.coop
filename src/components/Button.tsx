import React, { forwardRef } from "react";
import { Box, Button } from "theme-ui";
import Link from "next/link";

const SourceButton = ({ children, suffix, href, ...props }, ref) => {
  if (href) {
    return (
      <Box {...props}>
        <Link href={href}>
          <Button {...props} ref={ref}>
            <>{children}{suffix ? suffix : <></>}</>
          </Button>
        </Link>
      </Box>
    );
  } else {
    return (
      <Button ref={ref} {...props}>
        <>{children}</>
      </Button>
    );
  }
};

export default forwardRef(SourceButton);
