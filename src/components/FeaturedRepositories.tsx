import { useFeatured } from "@/lib/api";
import { RepositoryListing } from "@/components/RepositoryListing";
import { Heading, Grid, Box } from "theme-ui";

export default function FeaturedRepositories() {
    const { repositories, isLoading, isError } = useFeatured();
    

    if (isLoading) {
        const repositories = [null, null, null];
        return (
            <Box>
            <Heading as="h1" sx={{textAlign: "center"}}>Featured Repositories</Heading>
            <Grid>
                {
                    repositories.map((repository, i) => {
                        return <RepositoryListing key={`repository-${i}`} repository={repository} truncate={true} />
                    })
                }
            </Grid>
            </Box>
        )
    }

    if (isError) {
        return <Heading as="h2">Failed to load Featured Repositories</Heading>
    }

    console.log(repositories, isError)
    if (!isError && repositories) {
        return (
            <Box>
            <Heading as="h1" sx={{textAlign: "center"}}>Featured Repositories</Heading>
            <Grid>
                {
                    repositories.map((repository, i) => {
                        return <RepositoryListing key={`repository-${i}`} repository={repository} truncate={true} />
                    })
                }
            </Grid>
            </Box>
        )
    }

    
}