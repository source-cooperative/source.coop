"use client";

import {
  Container,
  Box,
  Link as RadixLink,
  Flex,
  Heading,
} from "@radix-ui/themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MonoText } from "@/components/core";
import { homeUrl, productListUrl } from "@/lib/urls";
import { Logo } from "./Logo";

// ponytail: at 0.75rem these links are ~15px tall, under the 24px WCAG 2.2
// minimum. inline-block is what makes the padding count toward the hit box —
// vertical padding on an inline element paints without growing it.
const tapTarget = { display: "inline-block", paddingBlock: "5px" } as const;

export function Footer() {
  const pathname = usePathname();

  return (
    <Box py="4" m="2" mt="6" style={{ borderTop: "1px solid var(--gray-5)" }}>
      <Container size="4">
        <Box>
          {pathname === "/" ? (
            <Flex
              direction="column"
              gap="4"
              my="4"
              style={{
                fontFamily: "var(--code-font-family)",
                fontSize: "0.75rem",
              }}
            >
              <Logo />
              <Flex gap="6" direction={{ initial: "column", sm: "row" }}>
                <Box>
                  <Heading size="3">ABOUT US</Heading>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    <li>
                      <RadixLink
                        href="https://docs.source.coop"
                        color="gray"
                        underline="always"
                        style={tapTarget}
                      >
                        Docs
                      </RadixLink>
                    </li>
                    <li>
                      <RadixLink
                        href="https://www.youtube.com/@GreatDataProducts"
                        color="gray"
                        underline="always"
                        style={tapTarget}
                      >
                        YouTube
                      </RadixLink>
                    </li>
                    <li>
                      <RadixLink
                        href="https://www.linkedin.com/company/sourcecooperative/"
                        color="gray"
                        underline="always"
                        style={tapTarget}
                      >
                        LinkedIn
                      </RadixLink>
                    </li>
                    <li>
                      <RadixLink
                        href="https://github.com/source-cooperative/"
                        color="gray"
                        underline="always"
                        style={tapTarget}
                      >
                        Github
                      </RadixLink>
                    </li>
                  </ul>
                </Box>
              </Flex>
            </Flex>
          ) : (
            <Box mb="3">
              {pathname !== "/" && (
                <Box mb="2">
                  <RadixLink color="gray" underline="always" asChild>
                    <Link href={homeUrl()}>
                      <MonoText size="2">Home</MonoText>
                    </Link>
                  </RadixLink>
                </Box>
              )}
              <Box mb="2">
                <RadixLink color="gray" underline="always" asChild>
                  <Link href={productListUrl()}>
                    <MonoText size="2">All Products</MonoText>
                  </Link>
                </RadixLink>
              </Box>
              <Box>
                <RadixLink
                  href="https://docs.source.coop"
                  color="gray"
                  underline="always"
                >
                  <MonoText size="2">Docs</MonoText>
                </RadixLink>
              </Box>
            </Box>
          )}
          <Box>
            <Box
              mb="3"
              style={{
                height: "1px",
                background: "var(--gray-5)",
                width: "100%",
              }}
            />
            <MonoText size="2" color="gray">
              Source Cooperative is a{" "}
              <RadixLink
                href="https://radiant.earth"
                color="gray"
                style={{ textDecoration: "underline" }}
              >
                <MonoText size="2" style={{ textTransform: "uppercase" }}>
                  Radiant Earth
                </MonoText>
              </RadixLink>{" "}
              project
            </MonoText>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
