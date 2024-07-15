// @ts-nocheck
import React from "react";
import { Box } from "theme-ui";

export default function SVG({ ...props }) {
  return (
    <Box as="svg" stroke="none" {...props}>
      {props.title ? <title>{props.title}</title> : <></>}
      {props.children}
    </Box>
  );
}
