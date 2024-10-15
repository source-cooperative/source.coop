/** @jsxImportSource theme-ui */

import { useState, useEffect } from "react";

import { SourceComponents } from "@/lib/provider";
import provider from "@mdx-js/react";

import * as runtime from "react/jsx-runtime";
import { evaluate } from "@mdx-js/mdx";
import { mdxOptions } from "@/lib/md";
import Skeleton from "react-loading-skeleton";
import { Heading, Paragraph } from "theme-ui";
import SourceLink from "../SourceLink";
import { Grid, Text, Box } from "theme-ui";

export function Markdown({ url }) {
  const [mdxModule, setMdxModule] = useState(null);
  const Content = mdxModule ? mdxModule.default : <></>;
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!url) {
      return;
    }
    fetch(url).then((res) => {
      if (res.ok) {
        res.text().then((text) => {
          evaluate(text, {
            ...provider,
            ...runtime,
            useMDXComponents: SourceComponents,
            ...mdxOptions,
          } as any).then((module) => {
            setMdxModule(module);
          });
        });
      } else {
        setNotFound(true);
      }
    });
  }, [url]);

  if (notFound) {
    return (
      <Box>
        <Text variant="formTitle">README</Text>
        <Grid variant="form">
          <Box variant="cards.componentMessage">
            <Text>
              This Repository Does Not Contain a README. If you are the owner of
              this repository, follow the instructions{" "}
              <SourceLink
                href={
                  "https://github.com/radiantearth/source-cooperative/wiki/Repositories#readme-markdown-files"
                }
              >
                here
              </SourceLink>{" "}
              to create a README.md
            </Text>
          </Box>
        </Grid>
      </Box>
    );
  }

  if (mdxModule) {
    return (
      <Box>
        <Content />
      </Box>
    );
  }

  return (
    <Box>
      <Skeleton count={10} />
    </Box>
  );
}
