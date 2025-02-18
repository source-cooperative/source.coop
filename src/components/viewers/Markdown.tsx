import SourceLink from '@source-cooperative/components/Link.js'
import MarkdownViewer from '@source-cooperative/components/markdown/viewer.js'
import type { FileProps } from '@source-cooperative/components/types.js'
import { Box, Grid, Text } from 'theme-ui'

export function Markdown({ url, filename }: FileProps) {
  return <MarkdownViewer url={url} filename={filename} errorChildren={
    <Box>
      <Text variant="formTitle">README</Text>
      <Grid variant="form">
        <Box variant="cards.componentMessage">
          <Text>
                  This Repository Does Not Contain a README. If you are the owner of
                  this repository, follow the instructions{' '}
            <SourceLink
              href={
                'https://github.com/radiantearth/source-cooperative/wiki/Repositories#readme-markdown-files'
              }
            >
                    here
            </SourceLink>{' '}
                  to create a README.md
          </Text>
        </Box>
      </Grid>
    </Box>} />
}