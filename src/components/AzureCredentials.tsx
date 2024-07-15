import { Box, Heading, Label, Paragraph } from "theme-ui"
import { CodeBlock } from "@/components/CodeBlock"
import SourceLink from "@/components/SourceLink"


export function AzureCredentials({credentials}) {
    return (
        <Box sx={{mt: 4}}>
          <Heading as="h2">Credentials</Heading>
          <Label>Permissions</Label>
          <CodeBlock copyButton={false}>
            Read Only
          </CodeBlock>
          <Label>Azure URI</Label>
          <CodeBlock copyButton={true}>
            {credentials.data.uri}
          </CodeBlock>
          <Heading as="h2">Usage Examples</Heading>
          <Paragraph>These examples make use of the azcopy CLI tool. The tool is available for download <SourceLink href="https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10#download-azcopy">here</SourceLink>, and documentation is available <SourceLink href="https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy?toc=%2Fazure%2Fstorage%2Fblobs%2Ftoc.json&bc=%2Fazure%2Fstorage%2Fblobs%2Fbreadcrumb%2Ftoc.json">here</SourceLink>.</Paragraph>
          
          <Box sx={{py: 2}}>
            <Label>List objects at the root of the repository</Label>
            <CodeBlock copyButton={true}>
              azcopy list {credentials.data.uri}
            </CodeBlock>
          </Box>
          <Box sx={{py: 2}}>
            <Label>Download the entire repository to the current directory</Label>
            <CodeBlock copyButton={true}>
              azcopy sync {credentials.data.uri} . --recursive=true
            </CodeBlock>
          </Box>
        </Box>
    )
}