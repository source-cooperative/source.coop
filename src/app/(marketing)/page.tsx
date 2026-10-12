import {
  Footer,
  Navigation,
  ProductsList,
  ThemeAwareImage,
} from "@/components";
import { getFeaturedProducts } from "@/lib/actions/products";
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
import { HeroGlobe } from "./HeroGlobe";
import { CONFIG } from "@/lib/config";
import { getTranslations } from "next-intl/server";

function SectionSubheading({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="solid" highContrast className={styles.subheading} mb="2">
      {children}
    </Badge>
  );
}

export default async function Landing() {
  const t = await getTranslations("LandingPage");
  const featuredCount = 4;
  const featured = await getFeaturedProducts(20);
  // Shuffle and pick 4 for the homepage
  for (let i = featured.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [featured[i], featured[j]] = [featured[j], featured[i]];
  }
  const products = featured.slice(0, featuredCount);

  return (
    <>
      <Box className={styles.landing} px={{ sm: "6", lg: "9" }}>
        <Box className={styles.landingInner} mx="auto" maxWidth="1400px">
          <Navigation />
          {/* ponytail: main starts after Navigation rather than wrapping the
              whole page — Landing.module.css pins the nav background with
              `.landingInner > nav`, so the nav has to stay a direct child. */}
          <main>
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
                      {t("heroTitle")}
                    </Heading>
                    <Text size={{ xs: "5", sm: "6" }} weight="bold">
                      {t("heroTagline")}
                    </Text>
                    <Text size={{ xs: "5", sm: "6" }}>{t("heroBody")}</Text>
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
                          {t("readDocs")}
                        </Button>
                      </Link>
                      <Link href={productListUrl()}>
                        <Button
                          size="3"
                          className={styles.subheading}
                          variant="solid"
                          highContrast
                        >
                          {t("exploreProducts")}
                        </Button>
                      </Link>
                    </Flex>
                  </Flex>
                  <Flex
                    display={{ initial: "none", sm: "flex" }}
                    className={styles.heroImageContainer}
                    flexShrink="0"
                    style={{ flexBasis: "600px" }}
                  >
                    <HeroGlobe wsUrl={CONFIG.locationWs.url || ""} />
                  </Flex>
                </Flex>
              </Container>
            </Section>
            <Section className={styles.productsSection} px="4">
              <Container>
                <SectionSubheading>{t("featuredEyebrow")}</SectionSubheading>
                <Heading size="8" mb="6">
                  {t("featuredHeading")}
                </Heading>
                <ProductsList products={products} grid />
              </Container>
            </Section>
            <Section px="4">
              <Container>
                <SectionSubheading>{t("whatIsEyebrow")}</SectionSubheading>
                <Flex
                  direction={{ initial: "column", sm: "row" }}
                  align="start"
                  gap="8"
                >
                  <Box flexBasis="50%">
                    <Heading size="8" mb="6">
                      {t("challengeHeading")}
                    </Heading>
                    <Text>
                      {t("challenge1")}
                      <br />
                      <br />
                      {t("challenge2")}
                      <br />
                      <br />
                      {t("challenge3")}
                    </Text>
                  </Box>
                  <Box flexBasis="50%">
                    <Heading size="8" mb="6">
                      {t("solutionHeading")}
                    </Heading>
                    <Text>
                      {t("solution1")}
                      <br />
                      <br />
                      {t("solution2")}
                      <br />
                      <br />
                      {t("solution3")}
                    </Text>
                  </Box>
                </Flex>
              </Container>
            </Section>
          </main>
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
                    <SectionSubheading>{t("whyEyebrow")}</SectionSubheading>
                    <Heading size="8" mb="6">
                      {t("whyHeading")}
                    </Heading>
                  </Box>
                  <Flex direction="column" gap="6" style={{ flex: 1 }}>
                    <Flex className={styles.tout} align="center" gap="4" py="6">
                      <ThemeAwareImage
                        width={120}
                        height={64}
                        lightSrc="/img/ringsIcon.svg"
                        darkSrc="/img/ringsIcon-dark.svg"
                        alt={t("iconAlt")}
                      />
                      <Box>
                        <Heading size="3" className={styles.subheading}>
                          {t("integrateHeading")}
                        </Heading>
                        <Text>{t("integrateBody")}</Text>
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
                          {t("neutralHeading")}
                        </Heading>
                        <Text>{t("neutralBody")}</Text>
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
                          {t("pricingHeading")}
                        </Heading>
                        <Text>
                          {t("pricing1")}
                          <br />
                          <br />
                          {t("pricing2")}
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
                  <SectionSubheading>{t("caseStudiesEyebrow")}</SectionSubheading>
                  <Heading size="8" mb="6">
                    {t("caseStudiesHeading")}
                  </Heading>
                </Box>
                <CaseStudyCarousel />
              </Flex>
            </Container>
          </Section>
          <Section px="4" className={styles.tout}>
            <Container>
              <Flex
                gap={{ xs: "2", md: "6" }}
                direction={{ initial: "column", sm: "row" }}
                align="start"
              >
                <Box flexGrow="2">
                  <Heading size="8">{t("builtForHeading")}</Heading>
                </Box>
                <Box flexGrow="1">
                  <Text size="5" mb="4" as="div">
                    {t("builtForBody")}
                  </Text>
                  <Link href={productListUrl()}>
                    <Button className={styles.subheading} highContrast>
                      {t("exploreData")}
                    </Button>
                  </Link>
                </Box>
              </Flex>
            </Container>
          </Section>
          <Footer />
        </Box>
      </Box>
    </>
  );
}
