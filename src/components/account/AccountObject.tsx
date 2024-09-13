import { Box, Heading, Image, Grid, Text } from "theme-ui";
import { Account, AccountProfileResponse } from "@/api/types";
import { ClientError } from "@/lib/client/accounts";
import useSWR from "swr";
import { GoLocation, GoLink, GoInfo } from "react-icons/go";
import SourceLink from "../SourceLink";

export function AccountObject({ account_id }: { account_id: string }) {
  const { data: profile, isLoading: _profileIsLoading } = useSWR<
    AccountProfileResponse,
    ClientError
  >(account_id ? { path: `/api/v1/accounts/${account_id}/profile` } : null, {
    refreshInterval: 0,
  });

  const { data: account } = useSWR<Account, ClientError>(
    account_id ? { path: `/api/v1/accounts/${account_id}` } : null,
    {
      refreshInterval: 0,
    }
  );

  return (
    <Grid
      sx={{
        gridTemplateColumns: ["1fr", "auto 1fr", "auto 1fr", "auto 1fr"],
        gap: 2,
      }}
    >
      {profile && profile.profile_image ? (
        <Image
          sx={{
            borderWidth: 4,
            borderColor: "primary",
            borderStyle: "solid",
            justifySelf: "center",
            width: "128px",
            height: "128px",
          }}
          src={`${profile.profile_image}?s=256`}
          alt={`${account_id} Profile Image`}
        />
      ) : (
        <></>
      )}
      <Box>
        <Heading as="h1" sx={{ my: 0 }}>
          {account && account?.disabled && (
            <Text sx={{ color: "red", fontFamily: "mono" }}>[DISABLED]</Text>
          )}
          {profile?.name ? profile.name : account_id}
        </Heading>
        <Grid
          sx={{
            gridTemplateColumns: "auto 1fr",
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: "14px",
              height: "14px",
              mr: 1,
              color: "secondary",
              alignSelf: "center",
            }}
          >
            <GoLocation />
          </Box>
          <Text
            sx={{ my: 0, fontFamily: "mono", fontWeight: "body", fontSize: 1 }}
          >
            {profile?.location ? profile.location : "Somewhere on Planet Earth"}
          </Text>
          {profile?.url && (
            <>
              <Box
                sx={{
                  width: "14px",
                  height: "14px",
                  mr: 1,
                  color: "secondary",
                  alignSelf: "center",
                }}
              >
                <GoLink />
              </Box>
              <Text
                sx={{
                  my: 0,
                  fontFamily: "mono",
                  fontWeight: "body",
                  fontSize: 1,
                }}
              >
                <SourceLink href={profile.url}>{profile.url}</SourceLink>
              </Text>
            </>
          )}

          <Box
            sx={{
              width: "14px",
              height: "14px",
              mr: 1,
              color: "secondary",
              alignSelf: "center",
            }}
          >
            <GoInfo />
          </Box>
          <Text
            sx={{ my: 0, fontFamily: "mono", fontWeight: "body", fontSize: 1 }}
          >
            {profile?.bio
              ? profile.bio.split(/\s+/).map((word, index) =>
                  word.startsWith("@") ? (
                    <SourceLink key={index} href={`/${word.slice(1)}`}>
                      {word}
                    </SourceLink>
                  ) : (
                    word + " "
                  )
                )
              : "No Bio Provided"}
          </Text>
        </Grid>
      </Box>
    </Grid>
  );
}
