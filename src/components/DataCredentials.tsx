import { Heading, Box, Grid } from "theme-ui"
import { FormSelect } from "@/components/Form"
import SourceButton from "@/components/Button"
import { useState } from "react";
import { useCredentials, useUser } from "@/lib/api";
import { getFormValues } from "@/lib/utils";
import { S3Credentials } from "@/components/S3Credentials";
import { AzureCredentials } from "@/components/AzureCredentials";
import { SignInLink } from "@/components/SignInLink";

export function DataCredentials({repository}) {
    const [credentialRequest, setCredentialRequest] = useState({
        mirror_id: null,
        random: null
    })

    const { user, isError: isUserError } = useUser();

    const {credentials, isLoading, isError} = useCredentials({
        account_id: user ? repository?.account_id : null,
        repository_id: user ? repository?.repository_id : null,
        mirror_id: user ? credentialRequest.mirror_id : null,
        random: user ? credentialRequest.random : null
    })

    function handleSubmit(e) {
        e.stopPropagation();
        e.preventDefault();

        const d = getFormValues({e, form: e.currentTarget.parentElement.parentElement.parentElement});
        setCredentialRequest({
            mirror_id: d.mirror,
            random: new Date()
        })
    }

    var mirrorOptions = [];

    if (repository) {
        for (const [mirror_id, mirror] of Object.entries(repository.data.mirrors)) {
            mirrorOptions.push({
                // @ts-ignore
                label: mirror.name,
                value: mirror_id
            })
        }

    }

    if (!user || isUserError) {
        return (
            <>
                <Heading as="h2">You must be <SignInLink>signed in</SignInLink> to generate credentials.</Heading>
            </>
        )
    } else {
        return (
            <Box>
                <Box as="form" onSubmit={handleSubmit}>
                    <Heading as="h2">Select Data Mirror</Heading>
                    <Grid sx={{
                        gridTemplateColumns: ["1fr", "2fr 1fr 3fr", "2fr 1fr 3fr", "2fr 1fr 5fr"]
                    }}>
                    <FormSelect
                            sx={{gridColumnStart: 1, gridColumnEnd: ["end", 2, 2, 2]}}
                            name="mirror"
                            label="Data Mirror"
                            options={mirrorOptions} />
                    <Box sx={{gridColumnStart: [2, 2, 2, 2], gridColumnEnd: "end", display: "flex", alignItems: "end"}}>
                        <SourceButton disabled={!repository || isLoading} onClick={handleSubmit}>{"Generate Credentials"}</SourceButton>
                    </Box>
                    </Grid>
                </Box>
                { credentials && credentials.provider == "s3" ? <S3Credentials credentials={credentials} /> : <></>}
                { credentials && credentials.provider == "az" ? <AzureCredentials credentials={credentials} /> : <></>}
            </Box>
        )
    }
}