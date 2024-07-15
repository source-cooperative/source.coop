import { Layout } from "@/components/Layout";
import { PoopSad } from "@carbonplan/emoji";
import { Row, Column } from "@carbonplan/components";
import { Box } from "theme-ui";
import NotFound from "@/components/NotFound";

export default function NotFoundPage() {
  return (
    <>
      <Layout>
        <NotFound />
      </Layout>
    </>
  );
}
