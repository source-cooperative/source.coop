import { Box, Heading, Label, Paragraph } from "theme-ui"
import { CodeBlock } from "@/components/CodeBlock"
import SourceLink from "@/components/SourceLink"

export function S3Credentials({credentials}) {
    return (
        <Box sx={{mt: 4}}>
          <Heading as="h2">Credentials</Heading>
          <Label>Permissions</Label>
          <CodeBlock copyButton={false}>
            {credentials.type == "read" ? "Read Only" : "Read and Write"}
          </CodeBlock>

          <Label>URI</Label>
          <CodeBlock copyButton={true}>
            {credentials.data.uri}
          </CodeBlock>

          <Label>AWS Region</Label>
          <CodeBlock copyButton={true}>
            {credentials.data.region}
          </CodeBlock>

          <Label>AWS Access Key ID</Label>
          <CodeBlock copyButton={true}>
            {credentials.aws_access_key_id}
          </CodeBlock>

          <Label>AWS Secret Access Key</Label>
          <CodeBlock copyButton={true}>
            {credentials.aws_secret_access_key}
          </CodeBlock>

          <Label>AWS Session Token</Label>
          <CodeBlock copyButton={true}>
            {credentials.aws_session_token}
          </CodeBlock>

          <Label>Expires</Label>
          <CodeBlock copyButton={true}>
            {credentials.expires}
          </CodeBlock>

          <Heading as="h2">Usage Examples</Heading>
          <Paragraph>These examples make use of the AWS CLI tool. The tool is available for download <SourceLink href="https://aws.amazon.com/cli/">here</SourceLink>, and documentation is available <SourceLink href="https://docs.aws.amazon.com/cli/index.html">here</SourceLink>.</Paragraph>
          <Paragraph>You must first set your environment variables to the credentials listed above using the following command</Paragraph>
          <CodeBlock copyButton={true}>
            export AWS_DEFAULT_REGION={credentials.data.region}<br/>
            export AWS_ACCESS_KEY_ID={credentials.aws_access_key_id}<br/>
            export AWS_SECRET_ACCESS_KEY={credentials.aws_secret_access_key}<br/>
            export AWS_SESSION_TOKEN={credentials.aws_session_token}
          </CodeBlock>

          <Box sx={{py: 2}}>
            <Label>List objects at the root of the repository</Label>
            <CodeBlock copyButton={true}>
              aws s3 ls {credentials.data.uri}/
            </CodeBlock>
          </Box>
          <Box sx={{py: 2}}>
            <Label>Download the entire repository to the current directory</Label>
            <CodeBlock copyButton={true}>
              aws s3 sync {credentials.data.uri}/ .
            </CodeBlock>
          </Box>
        </Box>
    )
}