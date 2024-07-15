import { Box, Heading, Image, Grid } from "theme-ui";
import { Info, Globe } from "@carbonplan/icons";
import Skeleton from "react-loading-skeleton";


export function ListUser({
  profile,
}: {
  profile: any;
}) {
  console.log(profile)
  return (
    <Grid sx={{
       gridTemplateColumns: [
        "auto",
        profile && profile.profile_image ? "185px auto" : "auto",
        profile && profile.profile_image ? "185px auto" : "auto",
        profile && profile.profile_image ? "185px auto" : "auto"
      ],
       gridGap: 0
    }}>
      {
        profile && profile.profile_image ? <Box sx={{gridRowStart: 1, gridRowEnd: 6, justifySelf: "center", width: "180px", height: "180px", backgroundColor: "primary", mr: 3}}><Image variant="profileImage" src={`${profile.profile_image}?s=256`} alt={`${profile.account_id} Profile Image`} /></Box> : <></>
      }
      <Heading as="h1" sx={{justifySelf: "flex-start", my: 0, width: "100%"}}>
        {
          !profile ? <Skeleton /> : profile.account_type == "organization" ? profile.name : profile.name.first_name + " " + profile.name.last_name
        }
      </Heading>
      <Box>
        {
          !profile ? <Skeleton /> :  profile.account_type == "organization" ? <><Info sx={{ width: "14px", height: "14px", mr: 1, color: "secondary", transform: "translate(0, 1px)"}}/> {profile.description}</> : <><Info sx={{ width: "14px", height: "14px", mr: 1, color: "secondary", transform: "translate(0, 1px)"}}/> { profile.bio ? profile.bio : " Source Cooperative User" }</>
        }
      </Box>
      <Box>
        {
          !profile ? <Skeleton /> : profile.account_type == "organization" ? <></> : profile.country ? <><Globe sx={{ width: "14px", height: "14px", mr: 1, color: "secondary", transform: "translate(0, 1px)"}}/> {profile.country}</> : <><Globe sx={{ width: "14px", height: "14px", mr: 1, color: "secondary", transform: "translate(0, 1px)"}}/> Somewhere on Planet Earth</>
        }
      </Box>
    </Grid>
  );
}
