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

export function Footer() {
  const pathname = usePathname();

  return (
    <Box py="4" mt="6" style={{ borderTop: "1px solid var(--gray-5)" }}>
      <Container size="4">
        <Box>
          {pathname === "/" ? (
            <Flex
              justify="center"
              align="center"
              direction="column"
              gap="4"
              my="4"
              style={{
                fontFamily: "var(--code-font-family)",
                fontSize: "0.75rem",
              }}
            >
              <Logo />
              <Flex gap="6" direction={{ xs: "column", sm: "row" }}>
                <Box flexBasis={"20%"}>
                  <Heading size="1">ABOUT US</Heading>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    <li>
                      <RadixLink
                        href="https://docs.source.coop"
                        color="gray"
                        underline="always"
                      >
                        Docs
                      </RadixLink>
                    </li>
                    <li>
                      <RadixLink
                        href="https://www.youtube.com/@GreatDataProducts"
                        color="gray"
                        underline="always"
                      >
                        YouTube
                      </RadixLink>
                    </li>
                    <li>
                      <RadixLink
                        href="https://www.linkedin.com/company/sourcecooperative/"
                        color="gray"
                        underline="always"
                      >
                        LinkedIn
                      </RadixLink>
                    </li>
                    <li>
                      <RadixLink
                        href="https://github.com/source-cooperative/"
                        color="gray"
                        underline="always"
                      >
                        Github
                      </RadixLink>
                    </li>
                  </ul>
                </Box>
                <Box flexBasis={"80%"}>
                  <Heading size="1">IMPRESSUM</Heading>
                  <strong>Governance:</strong>
                  <br />
                  Radiant Earth is a technology non-profit organization governed
                  by a board of directors. The board is responsible for setting
                  the organization&apos;s policies and overseeing its
                  operations.
                  <br />
                  <br />
                  <strong>Finances:</strong>
                  <br />
                  Radiant Earth is a registered 501(c)(3) organization. All
                  donations are tax-deductible to the extent allowed by law.
                  <br />
                  <br />
                  <strong>Privacy Policy:</strong>
                  <br />
                  Radiant Earth is committed to protecting the privacy of our
                  donors and website visitors. We will never sell or share your
                  personal information with any third party. For more
                  information, please see our <a href="">privacy policy</a>.
                </Box>
                <Box flexBasis={"80%"}>
                  Open Imagery Network Inc.doing business as: Radiant Earth
                  <br />
                  740 15th St NW
                  <br />
                  Suite 900
                  <br />
                  Washington DC, 20005
                  <br />
                  United States
                  <br />
                  <br />
                  Phone: 202-596-3603
                  <br />
                  Email: hello@radiant.earth
                  <br />
                  Website: https://radiant.earth
                  <br />
                  <br />
                  EIN: 81-3160991
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
