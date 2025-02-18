import { RepositoryList } from "@/components/repository/RepositoryList";
import SourceLink from '@source-cooperative/components/Link.js';
import { Box, Card, Paragraph } from "theme-ui";
import { Layout } from "../components/Layout";

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
