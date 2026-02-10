import {
  Footer,
  Navigation,
  ProductsList,
  ThemeAwareImage,
} from "@/components";
import { getProducts } from "@/lib/actions/products";
import {
  Badge,
  Blockquote,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Link,
  Section,
  Text,
} from "@radix-ui/themes";
import { ThemeInverseComponent } from "@/components/layout/ThemeInverseComponent";
import styles from "./Landing.module.css";

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
                <Heading size={{ xs: "8", sm: "9" }} my="5">
                  The Cooperative Data Repository
                </Heading>
                <Text size={{ xs: "5", sm: "6" }} weight="bold">
                  Data publishing and distribution for everyone.
                </Text>
                <Text size={{ xs: "5", sm: "6" }}>
                  Upload, share, and access large datasets without commercial
                  cloud expertise, lock-in or costs.
                </Text>
                <Flex gap="4" direction={{ xs: "column", sm: "row" }}>
                  <Button
                    size="3"
                    className={styles.subheading}
                    variant="outline"
                    highContrast
                  >
                    Read the docs &rarr;
                  </Button>
                  <Button
                    size="3"
                    className={styles.subheading}
                    variant="solid"
                    highContrast
                  >
                    Explore Data Products &rarr;
                  </Button>
                </Flex>
              </Flex>
              <Flex display={{ xs: "none", sm: "flex" }}>
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
            <SectionSubheading>Explore Source Data</SectionSubheading>
            <Heading size="8" mb="6">
              Featured Products
            </Heading>
            <ProductsList products={result.products} grid />
          </Container>
        </Section>
        <Section px="4">
          <Container>
            <Flex direction="column" align="start" gap="8">
              <Box>
                <SectionSubheading>Why Source?</SectionSubheading>
                <Heading size="8" mb="6">
                  The Challenge
                </Heading>
                <Text>
                  Data engineers, scientists, developers, and researchers often
                  spend more time fighting infrastructure than doing their
                  actual work. Commercial repositories force them to become
                  part-time system administrators—wrestling with cloud
                  configurations, scattered sources, and integration barriers
                  before productive work begins. Unpredictable costs, tricky
                  integration processes, and collaboration barriers prevent the
                  seamless sharing and reproducibility truly needed. When
                  commercial entities control access to data systems, expertise
                  gets diverted from solving global challenges to simply
                  accessing data.
                </Text>
              </Box>
              <Box>
                <Badge
                  className={styles.subheading}
                  variant="solid"
                  highContrast
                >
                  Why Source?
                </Badge>
                <Heading size="8" mb="6">
                  Our Mission
                </Heading>
                <Text>
                  Source.coop allows trusted organizations and individuals to
                  publish data of any kind at any scale without needing to build
                  or maintain their own infrastructure.
                  <br />
                  We believe no single entity should unilaterally control the
                  systems required to share information necessary to solve
                  global challenges
                </Text>
              </Box>
            </Flex>
          </Container>
        </Section>
        <ThemeInverseComponent mx="-100vw" px="100vw">
          <Section
            px="4"
            style={{ border: "1px solid", borderTop: 0, borderBottom: 0 }}
          >
            <Container>
              <Flex
                gap="6"
                direction={{ xs: "column", md: "row" }}
                align="start"
              >
                <Box style={{ flex: 1 }}>
                  <SectionSubheading>Who is source for?</SectionSubheading>
                  <Heading size="8" mb="6">
                    Data publishing for everyone
                  </Heading>
                </Box>
                <Flex direction="column" gap="6" style={{ flex: 1 }}>
                  <Flex
                    className={`${styles.tout} ${styles.toutPrice}`}
                    align="center"
                    gap="4"
                    py="6"
                  >
                    <Box width="4rem" minWidth="6rem" height="8rem">
                      <Text size="1" className={styles.priceAsterisk}>
                        S$S$S$S$S$S $S$S$S$S$S$ S$S$S$S$S$S $S$S$S$S$S$
                        S$S$S$S$S$S
                      </Text>
                    </Box>
                    <Box>
                      <Heading size="3" className={styles.subheading}>
                        Free to low cost
                      </Heading>
                      <Text size="1">
                        No opaque pricing calculators. No surprise egress fees.
                        Source offers free use for small to large datasets and a
                        straightforward cost structure that reinvests back into
                        the platform—not profits.
                      </Text>
                    </Box>
                  </Flex>
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
                        SOURCE COOPERATIVE provides a low cost, cloud based
                        repository, with a simplified interface, complete
                        documentation, from a neutral non-profit organization
                      </Text>
                    </Box>
                  </Flex>
                  <Flex
                    className={`${styles.tout} ${styles.toutHost}`}
                    align="center"
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
                        repository, so you&apos;re never trapped by proprietary
                        APIs or workflows.
                      </Text>
                    </Box>
                  </Flex>
                </Flex>
              </Flex>
            </Container>
          </Section>
        </ThemeInverseComponent>
        <Section px="4">
          <Container>
            <Flex
              gap={{ xs: "2", md: "6" }}
              direction={{ xs: "column", md: "row" }}
              align="start"
            >
              <Box>
                <SectionSubheading>Case Studies</SectionSubheading>
                <Heading size="8" mb="6">
                  Open Source, Governed, and Trusted By These Teams
                </Heading>
              </Box>
              <Box className={styles.caseStudy} p="4">
                <Blockquote size="2" mb="2">
                  "We can solve this question for ourselves, but the point of
                  our work is to bring the world's attention to these rural
                  communities and their needs. We want to make sure the data we
                  develop and the insights we generate are accessible to other
                  organizations and people. That's what brought us to Source."
                </Blockquote>
                <Text weight="bold" size="2">
                  — Cameron Kruse, Bridges to Prosperity Director of Digital
                  Technology
                </Text>
                <Box>
                  <Link
                    href="https://docs.source.coop/case-studies/bridges-to-prosperity"
                    target="_blank"
                    rel="noopener noreferrer"
                    size="1"
                  >
                    Read case study &rarr;
                  </Link>
                </Box>
              </Box>
            </Flex>
          </Container>
        </Section>
        <Section px="4">
          <Container>
            <Flex
              gap={{ xs: "2", md: "6" }}
              direction={{ xs: "column", md: "row" }}
              align="start"
            >
              <Box flexGrow="2">
                <Heading size="8">
                  Built for Data Engineers, Scientists, and Developers
                </Heading>
              </Box>
              <Box flexGrow="1">
                <Text size="5" mb="4" as="div">
                  Source.Coop supports your data lifecycle, from prototyping to
                  public release, without navigating corporate cloud policies.
                </Text>
                <Button className={styles.subheading} highContrast>
                  Explore the data &rarr;
                </Button>
              </Box>
            </Flex>
          </Container>
        </Section>
        <Footer />
      </Box>
    </Box>
  );
}
