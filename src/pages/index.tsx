import { Layout } from "../components/Layout";
import { Paragraph, Box, Heading, Card } from "theme-ui";
import { RepositoryList } from "@/components/repository/RepositoryList";

export default function Home() {
  return (
    <>
      <main>
        <Layout>
          <Card variant="code">
            <Paragraph>
              Source Cooperative is a neutral, non-profit data-sharing utility
              that allows trusted organizations to share data without purchasing
              a data portal SaaS subscription or managing infrastructure. Source
              allows organizations to share data using standard HTTP methods
              rather than requiring proprietary APIs or SaaS interfaces.
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
