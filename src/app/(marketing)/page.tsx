import {
  Footer,
  Navigation,
  ProductsList,
  ThemeAwareImage,
} from "@/components";
import { getProducts } from "@/lib/actions/products";
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Link,
  Section,
  Text,
} from "@radix-ui/themes";
import { CaseStudyCarousel } from "./CaseStudyCarousel";
import { ThemeInverseComponent } from "@/components/layout/ThemeInverseComponent";
import styles from "./Landing.module.css";
import { productListUrl } from "@/lib/urls";

function SectionSubheading({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="solid" highContrast className={styles.subheading} mb="2">
      {children}
    </Badge>
  );
}

export default async function Landing() {
  const result = await getProducts({
    featuredOnly: true,
    limit: 10,
  });

  return (
    <>
      <Box className={styles.landing} px={{ sm: "6", lg: "9" }}>
        <Box className={styles.landingInner} mx="auto" maxWidth="1400px">
          <Navigation />
          <Section className={styles.heroSection} px="4">
            <Container>
              <Flex align="center" gap="4">
                <Flex
                  direction="column"
                  gap="4"
                  className={styles.heroContent}
                  minWidth={{ sm: "60ch" }}
                >
                  <Heading size={{ initial: "8", xs: "9" }} my="5">
                    The Cooperative Data Publishing Utility
                  </Heading>
                  <Text size={{ xs: "5", sm: "6" }} weight="bold">
                    Data publishing at any scale for everyone.
                  </Text>
                  <Text size={{ xs: "5", sm: "6" }}>
                    Upload, share, and access data without needing to build or
                    maintain your own infrastructure.
                  </Text>
                  <Flex
                    gap="4"
                    align={{ initial: "stretch", xs: "start" }}
                    direction={{ initial: "column", sm: "row" }}
                  >
                    <Link href="https://docs.source.coop">
                      <Button
                        size="3"
                        className={styles.subheading}
                        variant="outline"
                        highContrast
                      >
                        Read the docs &rarr;
                      </Button>
                    </Link>
                    <Link href={productListUrl()}>
                      <Button
                        size="3"
                        className={styles.subheading}
                        variant="solid"
                        highContrast
                      >
                        Explore Data Products &rarr;
                      </Button>
                    </Link>
                  </Flex>
                </Flex>
                <Flex
                  display={{ initial: "none", sm: "flex" }}
                  className={styles.heroImageContainer}
                >
                  <img
                    className={styles.heroImage}
                    src="/img/dithered-globe.png"
                    alt="globe"
                  />
                </Flex>
              </Flex>
            </Container>
          </Section>
          <Section className={styles.productsSection} px="4">
            <Container>
              <SectionSubheading>Explore Source Datasets</SectionSubheading>
              <Heading size="8" mb="6">
                Featured Products
              </Heading>
              <ProductsList products={result.products} grid />
            </Container>
          </Section>
          <Section px="4">
            <Container>
              <SectionSubheading>What is Source Cooperative?</SectionSubheading>
              <Flex
                direction={{ initial: "column", sm: "row" }}
                align="start"
                gap="8"
              >
                <Box flexBasis="50%">
                  <Heading size="8" mb="6">
                    The Challenge
                  </Heading>
                  <Text>
                    Scientific data infrastructure wasn&apos;t built for
                    cross-border, cross-sector cooperation.
                    <br />
                    <br />
                    Addressing global challenges means combining data from
                    governments, research institutions, commercial providers,
                    and civil society—each with its own formats, access
                    patterns, and APIs.
                    <br />
                    <br />
                    Data engineers, scientists, and researchers spend more time
                    wrangling infrastructure than doing their actual work,
                    hampering collaboration and limiting informed decision
                    making.
                  </Text>
                </Box>
                <Box flexBasis="50%">
                  <Heading size="8" mb="6">
                    Our Solution
                  </Heading>
                  <Text>
                    Source is a nonprofit data publishing utility built on
                    commodity cloud object storage. Researchers publish data at
                    any scale without running servers, building portals, or
                    writing APIs.
                    <br />
                    <br />
                    Source handles cloud infrastructure so researchers can focus
                    on their data, not their hosting. Users access everything
                    through standard URLs that work with existing tools—no
                    custom portals, no proprietary APIs.
                    <br />
                    <br />
                    The service is intentionally commoditized: built to resist
                    lock-in and designed so that no single provider, funder, or
                    political decision can make research data disappear.
                  </Text>
                </Box>
              </Flex>
            </Container>
          </Section>
        </Box>
      </Box>
      <ThemeInverseComponent>
        <Box className={styles.landing} px={{ sm: "6", lg: "9" }}>
          <Box className={styles.landingInner} mx="auto" maxWidth="1400px">
            <Section
              px="4"
              style={{ border: "1px solid", borderTop: 0, borderBottom: 0 }}
            >
              <Container>
                <Flex
                  gap="6"
                  direction={{ initial: "column", sm: "row" }}
                  align="start"
                >
                  <Box style={{ flex: 1 }}>
                    <SectionSubheading>
                      Why Source is different
                    </SectionSubheading>
                    <Heading size="8" mb="6">
                      Data publishing for everyone
                    </Heading>
                  </Box>
                  <Flex direction="column" gap="6" style={{ flex: 1 }}>
                    <Flex className={styles.tout} align="center" gap="4" py="6">
                      <ThemeAwareImage
                        width={120}
                        height={64}
                        lightSrc="/img/ringsIcon.svg"
                        darkSrc="/img/ringsIcon-dark.svg"
                        alt="icon"
                      />
                      <Box>
                        <Heading size="3" className={styles.subheading}>
                          Integrate into any workflow
                        </Heading>
                        <Text>
                          Source is a vendor-neutral data publishing utility
                          that works with any S3-compatible cloud provider.
                        </Text>
                      </Box>
                    </Flex>
                    <Flex
                      className={`${styles.tout} ${styles.toutHost}`}
                      align="start"
                      gap="4"
                      py="6"
                    >
                      <Box width="4rem" minWidth="6rem" height="8rem">
                        <Text
                          style={{
                            fontSize: "12rem",
                            lineHeight: "100%",
                          }}
                        >
                          *
                        </Text>
                      </Box>
                      <Box>
                        <Heading size="3" className={styles.subheading}>
                          Neutral hosting, mission backed
                        </Heading>
                        <Text>
                          Retain full ownership and control of your data. Source
                          supports open formats and is a non-commercial
                          repository, so you&apos;re never trapped by
                          proprietary APIs or workflows.
                        </Text>
                      </Box>
                    </Flex>
                    <Flex
                      className={`${styles.tout} ${styles.toutPrice}`}
                      align="start"
                      gap="4"
                      py="6"
                    >
                      <Box
                        width="4rem"
                        minWidth="6rem"
                        className={styles.priceAsterisk}
                      >
                        <Text size="1" className={styles.priceAsterisk}>
                          S$S$S$S$S$S $S$S$S$S$S$ S$S$S$S$S$S $S$S$S$S$S$
                          S$S$S$S$S$S
                        </Text>
                      </Box>
                      <Box>
                        <Heading size="3" className={styles.subheading}>
                          Flat pricing
                        </Heading>
                        <Text>
                          Instead of building and maintaining data portals or
                          trying to wrangle variable cloud costs, Source lets
                          you focus on the fundamentals that make data easy to
                          publish and easy to use.
                          <br />
                          <br />
                          Pricing plans based on data volume and usage will be
                          announced soon.
                        </Text>
                      </Box>
                    </Flex>
                  </Flex>
                </Flex>
              </Container>
            </Section>
          </Box>
        </Box>
      </ThemeInverseComponent>
      <Box className={styles.landing} px={{ sm: "6", lg: "9" }}>
        <Box className={styles.landingInner} mx="auto" maxWidth="1400px">
          <Section px="4" className={styles.tout}>
            <Container>
              <Flex
                gap={{ initial: "2", sm: "6" }}
                direction={{ initial: "column", sm: "row" }}
                align="start"
              >
                <Box flexBasis="50%">
                  <SectionSubheading>Case Studies</SectionSubheading>
                  <Heading size="8" mb="6">
                    Open Source, Governed, and Trusted By These Teams
                  </Heading>
                </Box>
                <CaseStudyCarousel />
              </Flex>
            </Container>
          </Section>
          <Footer />
        </Box>
      </Box>
    </>
  );
}
