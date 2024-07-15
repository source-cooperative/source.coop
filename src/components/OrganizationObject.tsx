import { Box, Heading, Text, Flex, Link } from "theme-ui";
import { Globe } from "@carbonplan/icons";
import { Earth } from "@carbonplan/emoji";
import theme from "@/lib/theme";
import { RepositoryListing } from "@/components/RepositoryListing";
import Image from "next/image";

export function ListOrganization({
  profile,
  repositories,
}: {
  profile: any;
  repositories: any;
}) {
  var profile_image = <Earth width={150} />
  if (profile.account_id == "nasa") {
    profile_image = <Image src={"https://gpm.nasa.gov/sites/default/files/NASA-Logo-Large.jpg"} alt={profile.name + " Profile Image"} fill={true} />
  }
  
  return (
    <>
      <Flex
        sx={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: ["column", "column", "row", "row"],
          rowGap: 5,
          columnGap: 5,
        }}
        mb={5}
      >
        <Box sx={{ width: 500, height: (80/300)*500, objectFit: "contain", position: "relative" }}>
          { profile_image }
        </Box>
        <Box sx={{ flex: "1 1 auto" }}>
          <Heading as="h1" sx={{ display: "inline-box" }}>
            <Link href={"/" + profile.account_id} sx={{ textDecoration: "none" }}>
              {profile.name}
            </Link>
          </Heading>
          {profile.url == null ? (
            <></>
          ) : (
            <Box>
              <Flex
                sx={{ justifyContent: "left", alignItems: "center" }}
                mt={2}
              >
                <Globe sx={{ color: theme.colors.teal }} mr={2} />
                <Box sx={{ display: "inline" }} ml={0}>
                  <Link
                    href={profile.url}
                    sx={{ color: theme.colors.teal }}
                  >
                    {profile.url}
                  </Link>
                </Box>
              </Flex>
            </Box>
          )}
          <Box>
            <Flex sx={{ justifyContent: "left", alignItems: "center" }} mt={2}>
              <Box sx={{ display: "inline" }}>
                {profile.description == null
                  ? "Proud Source Coop Organization"
                  : profile.description}
              </Box>
            </Flex>
          </Box>
        </Box>
      </Flex>

      <Box>
        {repositories.length == 0 ? (
          <Heading>No Repositories Found</Heading>
        ) : (
          repositories.map((repo, i) => (
            <RepositoryListing key={"repo-" + i} repository={repo} truncate={true} />
          ))
        )}
      </Box>
    </>
  );
}
