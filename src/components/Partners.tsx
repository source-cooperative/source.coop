import { Box, Paragraph, Heading, Spinner, Grid, Flex, Link } from "theme-ui";
import { useEffect, useState } from "react";
import SourceLink from "@/components/SourceLink";

export function FeaturedRepositoryList() {
  const [repositoryContent, setRepositoryContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_BASE + "/repositories/featured/").then(
      (result) => {
        result.json().then((data) => {
          setLoading(false);
          setRepositoryContent(
            data.map((repository) => {
              const repo_link =
                "/" + repository.tenant_id + "/" + repository.id;
              let shortDescription = repository.description.substring(0, 200);

              if (shortDescription.length < repository.description.length) {
                shortDescription = shortDescription + "...";
              }

              return (
                <>
                  <Box>
                    <SourceLink href={repo_link}>
                      <Heading as="h3">
                        <Box as="span" sx={{ textTransform: "lowercase" }}>
                          {repository.tenant_id}/{repository.id}
                        </Box>
                      </Heading>
                    </SourceLink>
                    <Paragraph mt={2}>{shortDescription}</Paragraph>
                  </Box>
                </>
              );
            })
          );
        });
      }
    );
  }, []);

  if (loading) {
    return (
      <Flex
        sx={{
          justifyContent: loading ? "center" : null,
          alignItems: loading ? "center" : null,
        }}
      >
        <Spinner />
      </Flex>
    );
  }

  return (
    <Grid
      sx={{
        gridTemplateColumns: [null, "auto", "auto auto", "auto auto"],
      }}
    >
      {repositoryContent.map((content, i) => {
        return (
          <Flex
            sx={{
              gridGap: 10,
            }}
            key={"featured-repository-" + i}
          >
            {content}
          </Flex>
        );
      })}
    </Grid>
  );
}
