import { ProductsList } from "@/components";
import { getProducts } from "@/lib/actions/products";
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Section,
  Text,
} from "@radix-ui/themes";
import { Accordion } from "radix-ui";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import styles from "./landing.module.css";

export const metadata = {
  title: "Featured Products | Source Cooperative",
  description: "Browse and discover public data products on Source.coop",
  openGraph: {
    title: "Featured Products | Source Cooperative",
    description: "Browse and discover public data products on Source.coop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Featured Products | Source Cooperative",
    description: "Browse and discover public data products on Source.coop",
  },
};

export default async function Landing() {
  const result = await getProducts({
    featuredOnly: true,
    limit: 10,
  });
  return (
    <Box className={styles.landing} p="0" m="0">
      <Section className={styles.heroSection}>
        <Container size="1">
          <Flex align="center" gap="4">
            <Flex direction="column" gap="4" className={styles.heroContent}>
              <Heading size="9" my="5">
                The Cooperative Data Repository
              </Heading>
              <Text size="5" weight="bold">
                Data publishing and distribution for everyone.
              </Text>
              <Text size="5">
                Upload, share, and access large datasets without commercial
                cloud expertise, lock-in or costs.
              </Text>
              <Flex gap="4">
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
                  Explore Data Products &darr;
                </Button>
              </Flex>
            </Flex>
            <Flex>
              <img
                className={styles.heroImage}
                src="/img/dithered-globe.png"
                alt="globe"
              />
            </Flex>
          </Flex>
        </Container>
      </Section>
      <Section className={styles.partnerLogos}>
        <Flex gap="4" align="center">
          <p className={styles.subheading}>Publishing on Source</p>
          <img src="https://placehold.co/120" alt="Partner Logos" />
          <img src="https://placehold.co/120" alt="Partner Logos" />
          <img src="https://placehold.co/120" alt="Partner Logos" />
          <img src="https://placehold.co/120" alt="Partner Logos" />
          <img src="https://placehold.co/120" alt="Partner Logos" />
          <img src="https://placehold.co/120" alt="Partner Logos" />
        </Flex>
      </Section>
      <Section>
        <Container>
          <Flex gap="6">
            <img src="https://placehold.co/400" alt="Diagram" />

            <Flex direction="column" align="start" gap="4">
              <Badge className={styles.subheading} variant="solid" highContrast>
                Why Source?
              </Badge>
              <Heading>The Challenge</Heading>
              <Text>
                Data engineers, scientists, developers, and researchers often
                spend more time fighting infrastructure than doing their actual
                work. Commercial repositories force them to become part-time
                system administrators—wrestling with cloud configurations,
                scattered sources, and integration barriers before productive
                work begins. Unpredictable costs, tricky integration processes,
                and collaboration barriers prevent the seamless sharing and
                reproducibility truly needed. When commercial entities control
                access to data systems, expertise gets diverted from solving
                global challenges to simply accessing data.
              </Text>
              <Badge className={styles.subheading} variant="solid" highContrast>
                Why Source?
              </Badge>
              <Heading>The Mission</Heading>
              <Text>
                Source.coop allows trusted organizations and individuals to
                publish data of any kind at any scale without needing to build
                or maintain their own infrastructure.
                <br />
                We believe no single entity should unilaterally control the
                systems required to share information necessary to solve global
                challenges
              </Text>
            </Flex>
          </Flex>
        </Container>
      </Section>
      <Section className="dark">
        <Container>
          <Flex gap="6">
            <Box className="dark" style={{ flex: 1 }}>
              <Badge variant="solid" highContrast className={styles.subheading}>
                Who is source for?
              </Badge>
              <Heading size="7">Data publishing for everyone</Heading>
            </Box>
            <Flex direction="column" gap="6" style={{ flex: 1 }}>
              <Flex
                className={`${styles.tout} ${styles.toutPrice}`}
                align="center"
                gap="4"
              >
                <Box width="5" height="5">
                  <p>
                    S$S$S
                    <br />
                    $S$S$
                    <br />
                    S$S$S
                    <br />
                    $S$S$
                    <br />
                    S$S$S
                  </p>
                </Box>
                <Box>
                  <Heading size="3" className={styles.subheading}>
                    Free to low cost
                  </Heading>
                  <Text size="1">
                    No opaque pricing calculators. No surprise egress fees.
                    Source offers free use for small to large datasets and a
                    straightforward cost structure that reinvests back into the
                    platform—not profits.
                  </Text>
                </Box>
              </Flex>
              <Flex
                direction="column"
                className={styles.tout}
                align="center"
                gap="4"
              >
                <Box width="5" height="5"></Box>
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
              >
                <Box width="5" height="5">
                  <p>*</p>
                </Box>
                <Box>
                  <Heading size="3" className={styles.subheading}>
                    Neutral hosting, mission backed
                  </Heading>
                  <Text>
                    Retain full ownership and control of your data. Source
                    supports open formats and is a non-commercial repository, so
                    you&apos;re never trapped by proprietary APIs or workflows.
                  </Text>
                </Box>
              </Flex>
            </Flex>
          </Flex>
        </Container>
      </Section>
      <Section>
        <Container>
          <Badge variant="solid" highContrast className={styles.subheading}>
            Explore Source Data
          </Badge>
          <Heading size="7">Featured Products</Heading>
          <ProductsList products={result.products} />
        </Container>
      </Section>
      <Section>
        <Container size="2">
          <Badge variant="solid" highContrast className={styles.subheading}>
            FAQs
          </Badge>
          <Heading size="7">How is Source Different?</Heading>
          <Accordion.Root
            className={styles.AccordionRoot}
            type="single"
            defaultValue="item-1"
            collapsible
          >
            <Accordion.Item className={styles.AccordionItem} value="item-1">
              <Accordion.Header>
                <Accordion.Trigger className={styles.AccordionTrigger}>
                  <span>
                    <Heading size="3" as="h4">
                      vs. Cloud object storage
                    </Heading>
                  </span>
                  <ChevronDownIcon className="AccordionChevron" aria-hidden />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content>
                While object storage services like Amazon S3, Google Cloud
                Storage, and Azure Blob Storage can store data, they don&apos;t
                make it discoverable or accessible to others. Source is a
                utility built on top of cloud object storage services that
                provides a public catalog, standardized access, and community
                visibility that raw cloud storage can&apos;t offer.
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item className="AccordionItem" value="item-2">
              <Accordion.Header>
                <Heading size="3">vs. Cloud file sharing services</Heading>
                <Accordion.Trigger />
              </Accordion.Header>
              <Accordion.Content>
                While object storage services like Amazon S3, Google Cloud
                Storage, and Azure Blob Storage can store data, they don&apos;t
                make it discoverable or accessible to others. Source is a
                utility built on top of cloud object storage services that
                provides a public catalog, standardized access, and community
                visibility that raw cloud storage can&apos;t offer.
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item className="AccordionItem" value="item-3">
              <Accordion.Header>
                vs. Building your own solution
                <Accordion.Trigger />
              </Accordion.Header>
              <Accordion.Content>
                While object storage services like Amazon S3, Google Cloud
                Storage, and Azure Blob Storage can store data, they don&apos;t
                make it discoverable or accessible to others. Source is a
                utility built on top of cloud object storage services that
                provides a public catalog, standardized access, and community
                visibility that raw cloud storage can&apos;t offer.
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        </Container>
      </Section>
      <Section>
        <Container>
          <Badge variant="solid" highContrast className={styles.subheading}>
            Testimonials
          </Badge>
          <Heading size="7">
            Open Source, Governed, and Trusted By These Teams
          </Heading>
        </Container>
      </Section>
      <Section>
        <Container>
          <Badge variant="solid" highContrast className={styles.subheading}>
            How to get started
          </Badge>
          <Heading size="7">Source in Action</Heading>
        </Container>
      </Section>
      <Section>
        <Container>
          <Flex>
            <Box>
              <Heading>
                Built for Data Engineers, Scientists, and Developers
              </Heading>
              <Text>
                Source.Coop supports your data lifecycle, from prototyping to
                public release, without navigating corporate cloud policies.
              </Text>
            </Box>
            <Button>Explore the data {"->"}</Button>
          </Flex>
        </Container>
      </Section>
    </Box>
  );
}
