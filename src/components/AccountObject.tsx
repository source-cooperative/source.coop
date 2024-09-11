import { Box, Heading, Image, Grid } from "theme-ui";
import { Info, Globe } from "@carbonplan/icons";
import Skeleton from "react-loading-skeleton";
import Link from "next/link";

export function AccountObject({
  profile,
  account_id,
}: {
  profile: any;
  account_id: string;
}) {
  console.log(profile);
  return (
    <Grid
      sx={{
        gridTemplateColumns: [
          "auto",
          profile && profile.profile_image ? "185px auto" : "auto",
          profile && profile.profile_image ? "185px auto" : "auto",
          profile && profile.profile_image ? "185px auto" : "auto",
        ],
        gridGap: 0,
        mb: 3,
      }}
    >
      {profile && profile.profile_image ? (
        <Box
          sx={{
            gridRowStart: 1,
            gridRowEnd: 6,
            justifySelf: "center",
            width: "180px",
            height: "180px",
            backgroundColor: "primary",
            mr: 3,
          }}
        >
          <Image
            variant="profileImage"
            src={`${profile.profile_image}?s=256`}
            alt={`${profile.account_id} Profile Image`}
          />
        </Box>
      ) : (
        <></>
      )}
      <Heading as="h1" sx={{ justifySelf: "flex-start", my: 0, width: "100%" }}>
        {!profile ? <Skeleton /> : profile.name ? profile.name : account_id}
      </Heading>
      <Box>
        {!profile ? (
          <Skeleton />
        ) : (
          <>
            <Globe
              sx={{
                width: "14px",
                height: "14px",
                mr: 1,
                color: "secondary",
                transform: "translate(0, 1px)",
              }}
            />{" "}
            {profile.location ? profile.location : "Somewhere on Planet Earth"}
          </>
        )}
      </Box>
      <Box>
        {!profile ? (
          <Skeleton />
        ) : profile.url ? (
          <>
            <Info
              sx={{
                width: "14px",
                height: "14px",
                mr: 1,
                color: "secondary",
                transform: "translate(0, 1px)",
              }}
            />{" "}
            <Link href={profile.url}>{profile.url}</Link>
          </>
        ) : (
          <></>
        )}
      </Box>
      <Box mt={2}>
        {!profile ? (
          <Skeleton />
        ) : (
          <>{profile.bio ? profile.bio : "No Bio Provided"}</>
        )}
      </Box>
    </Grid>
  );
}
