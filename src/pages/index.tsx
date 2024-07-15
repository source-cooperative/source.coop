import { Layout } from "../components/Layout";
import { Paragraph } from "theme-ui";
import { CodeBlock } from "@/components/CodeBlock";
import FeaturedRepositories from "@/components/FeaturedRepositories";
import FeaturedPartners from "@/components/FeaturedPartners";


export default function Home() {
  return (
    <>
      <main>
        <Layout>
          <CodeBlock copyButton={false}>
            <Paragraph>
              Source Cooperative is a neutral, non-profit data-sharing utility
              that allows trusted organizations to share data without purchasing a
              data portal SaaS subscription or managing infrastructure. Source
              allows organizations to share data using standard HTTP methods
              rather than requiring proprietary APIs or SaaS interfaces. It is
              currently in private beta.
            </Paragraph>
          </CodeBlock>

          <FeaturedRepositories />
        </Layout>
      </main>
    </>
  );
}
