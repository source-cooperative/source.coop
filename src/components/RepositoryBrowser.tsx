import { useRouter } from "next/router"
import { Box, Paragraph, Card, Grid, Text, Flex, Heading, Label, Divider } from "theme-ui";
import Skeleton from 'react-loading-skeleton';
import SVG from "./SVG";
import SourceLink from "./SourceLink";
import SourceButton from "@/components/Button"
import { useRepository, useRepositoryBrowsePage } from "@/lib/api";
import { CodeBlock } from "./CodeBlock";
import dynamic from 'next/dynamic'
import { useTheme } from "@emotion/react";
import Link from "next/link";
import Button from "@/components/Button";

function RepositoryBreadcrumbs({account_id, repository_id, prefix, basePath}) {
  if (!account_id || !repository_id) {
    return <Skeleton />
  }


  var path = `/${account_id}/${repository_id}`
  var crumbs = [];
  crumbs.push(["root", path]);


  if (prefix) {
    prefix.forEach((p) => {
      path = `${path}/${p}`
      crumbs.push([p, path])
    })
  }

  return (
    <Paragraph
        sx={{
            fontFamily: "mono",
            fontSize: 0,
            color: "secondary",
            overflowWrap: "break-word",
        }}
    >
    {
      crumbs.map((crumb, i) => {
        return <Box key={`breadcrumb-${i}`} sx={{display: "inline"}}><SourceLink variant="breadcrumb" href={crumb[1]} >{crumb[0]}</SourceLink>{crumbs.length == i+1 && basePath && !basePath.endsWith("/") ? "" : "/"}</Box>
      })
    }
    </Paragraph>
  )
}

function humanFileSize(bytes, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024;
  
    if (Math.abs(bytes) < thresh) {
      return bytes + " B";
    }
  
    const units = si
      ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
      : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
    let u = -1;
    const r = 10 ** dp;
  
    do {
      bytes /= thresh;
      ++u;
    } while (
      Math.round(Math.abs(bytes) * r) / r >= thresh &&
      u < units.length - 1
    );
  
    return bytes.toFixed(dp) + " " + units[u];
}
  

function FileIcon({ color = null }: { color: string }) {
    return (
      <SVG
        viewBox="0 0 16 16"
        sx={{
          height: "0.9em",
          fill: color,
          display: "inline",
          color: { color },
          p: 0,
          textAlign: "left",
          width: "inherit",
          mr: 1
        }}
      >
        <g>
          <path d="M5.526 10.273c-.542 0-.832.563-.832 1.612 0 .088.003.173.006.252l1.559-1.143c-.126-.474-.375-.72-.733-.72zm-.732 2.508c.126.472.372.718.732.718.54 0 .83-.563.83-1.614 0-.085-.003-.17-.006-.25l-1.556 1.146z" />
          <path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0zM9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1zm-2.45 8.385c0 1.415-.548 2.206-1.524 2.206C4.548 14.09 4 13.3 4 11.885c0-1.412.548-2.203 1.526-2.203.976 0 1.524.79 1.524 2.203zm3.805 1.52V14h-3v-.595h1.181V10.5h-.05l-1.136.747v-.688l1.19-.786h.69v3.633h1.125z" />
        </g>
      </SVG>
    );
  }
  
function FolderIcon({ color = null }: { color: string }) {
    return (
      <SVG
        viewBox="0 0 16 16"
        sx={{
          height: "0.9em",
          fill: color,
          display: "inline",
          color: { color },
          p: 0,
          textAlign: "left",
          width: "inherit",
          mr: 1
        }}
      >
        <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3zm-8.322.12C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139z" />
      </SVG>
    );
}
  
function Listing({ ...props }) {
    return (
      <>
        <SourceLink onClick={props.onClick} href={props.href}>
          {props.object.type == "DIRECTORY" ? (
            <FolderIcon color={"primary"} />
          ) : (
            <FileIcon color={"primary"} />
          )}
        </SourceLink>
        <SourceLink onClick={props.onClick} href={props.href} sx={{textOverflow: "ellipsis"}}>
          {props.object.name}
        </SourceLink>
        <SourceLink
          onClick={props.onClick}
          href={props.href}
          sx={{textAlign: "right"}}
        >
          {props.object.size ? (
            <Text>{humanFileSize(props.object.size)}</Text>
          ) : (
            <></>
          )}
        </SourceLink>
      </>
    );
}

function RepositoryContentList({account_id, repository_id, prefix}) {
  const router = useRouter();
  const { repository } = useRepository({account_id, repository_id});

  const {
    limit,
    next
  } = router.query;

  const {
    browseResult,
    isLoading,
    isError
  } = useRepositoryBrowsePage({
    account_id,
    repository_id,
    cdn: repository?.data?.cdn,
    prefix: prefix ? `${prefix.join("/")}/` : "",
    limit: limit ? limit : 10,
    next
  })

  const basePrefix = prefix ? prefix.join("/") : ""; 

  let baseHref;

  if (basePrefix) {
    baseHref = `/${account_id}/${repository_id}/${basePrefix}`;
  } else {
    baseHref = `/${account_id}/${repository_id}`;
  }

  var contents = [];
  if (isLoading) {
    contents = [
      <Skeleton />,
      <Skeleton />,
      <Skeleton />,
      <Skeleton />,
      <Skeleton />,
      <Skeleton />,
      <Skeleton />,
      <Skeleton />,
      <Skeleton />,
      <Skeleton />
    ]
  } else if (browseResult) {
    browseResult.prefixes.forEach((p) => {
      contents.push(<SourceLink href={`${baseHref}/${p}`}><FolderIcon color={"primary"} />{p}</SourceLink>);
    });

    browseResult.objects.forEach((obj) => {
      contents.push(<SourceLink href={`${baseHref}/${obj.name}`}><Flex sx={{justifyContent: "space-between"}}><Box sx={{display: "inline"}}><FileIcon color={"primary"} /><Text>{obj.name}</Text></Box><Text>{humanFileSize(obj.size)}</Text></Flex></SourceLink>);
    });
  }

  return (
    <>
      <Card variant="code" sx={{fontSize: 1, fontFamily: "mono"}}>
          {
            contents.map((content, i) => {
              return <Box key={i}>{content}</Box>
            })
          }
      </Card>
      <Grid
      sx={{
        pt: 2,
        gridTemplateColumns: "auto auto",
      }}
      >
      <Box sx={{textAlign: "left"}}>
          <SourceButton variant="primary" onClick={() => router.back()} disabled={!router.query.next}>Prev</SourceButton>
      </Box>
      <Box sx={{textAlign: "right"}}>
          <SourceButton variant="primary" disabled={!browseResult || !browseResult.next} href={{ query: { ...router.query, next: browseResult ? browseResult.next : null } }}>Next</SourceButton>
      </Box>

      </Grid>
    </>
  )
}

function RepositoryObjectViewer({account_id, repository_id, prefix}) {
  if (!prefix || !account_id || !repository_id) {
    return <></>;
  }
  console.log(prefix);
  var viewer = null;
  const { repository } = useRepository({account_id, repository_id});
  const filename = prefix.at(-1);

  if (filename.endsWith(".pmtiles")) {
    const PMTilesViewer = dynamic(() => import('@/components/PMTilesViewer'), {
      ssr: false,
    })
    viewer = <PMTilesViewer url={`${repository?.data?.cdn}/${account_id}/${repository_id}/${prefix.join("/")}`} />;
  } else if (filename.endsWith(".geojson")) {
    const GeoJSONViewer = dynamic(() => import('@/components/GeoJSONViewer'), {
      ssr: false,
    })
    viewer = <GeoJSONViewer url={`${repository?.data?.cdn}/${account_id}/${repository_id}/${prefix.join("/")}`} />;
  }

  return (
    <Box>
      <Heading as="h2">
        Details
      </Heading>
      <Card variant="code" sx={{fontSize: 1, maxWidth: "fit-content", pr: 6}}>
        <ul>
          <li><Heading as="h4" sx={{display: "inline", textTransform: "uppercase"}}>Name:</Heading> {filename}</li>
          <li><Heading as="h4" sx={{display: "inline", textTransform: "uppercase"}}>URL:</Heading> <Link href={`${repository?.data?.cdn}/${account_id}/${repository_id}/${prefix.join("/")}`}><Text sx={{color: "primary", textDecoration: "underline"}}>{`${repository?.data?.cdn}/${account_id}/${repository_id}/${prefix.join("/")}`}</Text></Link></li>
        </ul>
      </Card>
      <Button variant="primary" href={`${repository?.data?.cdn}/${account_id}/${repository_id}/${prefix.join("/")}`} sx={{mt: 2}}>Download</Button>
      {
        viewer ? <>
          <Heading as="h2">Preview</Heading> 
          {viewer}
        </> : <></>
      }

      
      
      
      

    </Box>
  )
}


export default function RepositoryBrowser({account_id, repository_id}) {
    const router = useRouter();

    const {
      slug: prefix,
    } = router.query;
    const isFolder = router.asPath.split("?")[0].endsWith("/");


    return (
      <Box>
        
        <RepositoryBreadcrumbs account_id={account_id} repository_id={repository_id} prefix={prefix} basePath={router.asPath} />
        {
          isFolder ? 
            <>
              <RepositoryContentList  account_id={account_id} repository_id={repository_id} prefix={prefix} />
            </>
          : 
            <RepositoryObjectViewer account_id={account_id} repository_id={repository_id} prefix={prefix} />
        }
        
      </Box>
    )

/*
    return (
        <Box>
            <RepositoryBreadcrumbs account_id={account_id} repository_id={repository_id} prefix={prefix} />
            <RepositoryContentList browseResult={browseResult} isLoading={isLoading} isError={isError} />
            <Card variant="code" sx={{fontSize: 1}}>
                <Grid sx={{
                    mt: 0,
                    rowGap: 0,
                    gridTemplateColumns: "0 4fr auto",
                    colGap: 4,
                    gridTemplateRows: "auto",
                    fontFamily: "mono"
                }}>
                    { browseResult.prefix ? <Listing key={"listing-prev"} object={{ type: "DIRECTORY", name: "..", }} href={browseResult.baseUrl + browseResult.parentPrefix } /> : <></> }
                    {
                        browseResult.prefixes.map((prefix, i) => {
                            if (!prefix) {
                                return <Box sx={{gridColumnStart: 1, gridColumnEnd: 3}}><Skeleton /></Box>
                            }
                            return <Listing key={"listing-prefix-" + i} object={{type: "DIRECTORY", name: prefix}} href={browseResult.baseUrl + browseResult.prefix + prefix} />
                        })
                    }

                    {
                        browseResult.objects.map((obj, i) => {
                            if (!obj) {
                                return <Box sx={{gridColumnStart: 1, gridColumnEnd: 3}}><Skeleton /></Box>
                            }
                            return <Listing key={"listing-prefix-" + i} object={{type: "OBJECT", name: obj.name, size: obj.size}} href={obj.url} />
                        })
                    }
                </Grid>
            </Card>
            <Grid
                sx={{
                  pt: 2,
                  gridTemplateColumns: "auto auto",
                }}
              >
                <Box sx={{textAlign: "left"}}>
                    <SourceButton variant="primary" onClick={() => router.back()} disabled={!router.query.next}>Prev</SourceButton>
                </Box>
                <Box sx={{textAlign: "right"}}>
                    <SourceButton variant="primary" disabled={!browseResult.next} href={{ query: { ...router.query, next: browseResult.next } }}>Next</SourceButton>
                </Box>
                
              </Grid>
        </Box>
    )*/
}