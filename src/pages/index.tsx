import { Layout } from "../components/Layout";
import { Paragraph, Box, Heading, Card } from "theme-ui";
import { RepositoryList } from "@/components/repository/RepositoryList";
import SourceLink from "@/components/SourceLink";

export default function Home() {
  return (
    <>
      <main>
        <Layout>
          <Card variant="code">
            <Paragraph>
              Source Cooperative is a data publishing utility that allows trusted organizations and individuals to share data using standard HTTP methods. Learn more in <SourceLink href="https://docs.source.coop">our documentation</SourceLink>.
            </Paragraph>
          </Card>
          <Box sx={{ mt: 4 }}>
            <RepositoryList title={"Featured Repositories"} featured={true} />
          </Box>
        </Layout>
      </main>
    </>
  );
}
