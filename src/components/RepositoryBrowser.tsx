import { useRouter } from "next/router";
import { Box, Paragraph, Card, Grid, Text, Flex, Heading } from "theme-ui";
import Skeleton from "react-loading-skeleton";
import SVG from "./SVG";
import SourceLink from "./SourceLink";
import SourceButton from "@/components/Button";
import dynamic from "next/dynamic";
import Link from "next/link";
import Button from "@/components/Button";
import {
  S3Client,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { useEffect, useState } from "react";

const s3Client = new S3Client({
  endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: "foo",
    secretAccessKey: "bar",
  },
});

function RepositoryBreadcrumbs({
  account_id,
  repository_id,
  prefix,
  basePath,
}) {
  if (!account_id || !repository_id) {
    return <Skeleton />;
  }

  var path = `/${account_id}/${repository_id}`;
  var crumbs = [];
  crumbs.push(["root", path]);

  if (prefix) {
    prefix.forEach((p) => {
      path = `${path}/${p}`;
      crumbs.push([p, path]);
    });
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
      {crumbs.map((crumb, i) => {
        return (
          <Box key={`breadcrumb-${i}`} sx={{ display: "inline" }}>
            <SourceLink variant="breadcrumb" href={crumb[1]}>
              {crumb[0]}
            </SourceLink>
            {crumbs.length == i + 1 && basePath && !basePath.endsWith("/")
              ? ""
              : "/"}
          </Box>
        );
      })}
    </Paragraph>
  );
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
        mr: 1,
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
        mr: 1,
      }}
    >
      <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3zm-8.322.12C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139z" />
    </SVG>
  );
}

export default function RepositoryBrowser({ account_id, repository_id }) {
  const router = useRouter();
  const { slug, limit, next } = router.query;
  const [resultState, setResultState] = useState({
    loading: true,
    listResult: null,
    object: null,
    key: null,
  });

  useEffect(() => {
    if (!account_id || !repository_id) {
      return;
    }

    const prefix = Array.isArray(slug) ? slug.join("/") : slug;
    const bucket: string = account_id;
    const key: string = prefix
      ? `${repository_id}/${prefix}`
      : `${repository_id}/`;

    setResultState({ loading: true, listResult: null, object: null, key });

    const input = {
      Bucket: bucket,
      Key: key,
    };
    const headCommand = new HeadObjectCommand(input);
    s3Client.send(headCommand).then(
      (res) => {
        setResultState({ loading: false, listResult: null, object: res, key });
      },
      (e) => {
        const listCommand = new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: key.endsWith("/") ? key : key + "/",
          Delimiter: "/",
          ContinuationToken: next ? (next as string) : undefined,
          MaxKeys: limit ? parseInt(limit as string) : 100,
        });
        s3Client.send(listCommand).then(
          (res) => {
            console.log(res);
            setResultState({
              loading: false,
              listResult: res,
              object: null,
              key,
            });
          },
          (e) => {
            console.log(e);
            setResultState({
              loading: false,
              listResult: null,
              object: null,
              key,
            });
          }
        );
      }
    );
  }, [router.query]);

  if (resultState.loading) {
    return <>Loading...</>;
  }
  if (resultState.listResult) {
    console.log(resultState.listResult);
    return (
      <Box>
        <RepositoryBreadcrumbs
          account_id={account_id}
          repository_id={repository_id}
          prefix={slug}
          basePath={router.asPath}
        />
        <Card variant="code" sx={{ fontSize: 1, fontFamily: "mono" }}>
          {resultState.listResult.CommonPrefixes?.map((cp, i) => {
            return (
              <Box key={`cp-${i}`}>
                <SourceLink href={`/${account_id}/${cp.Prefix}`}>
                  <FolderIcon color={"primary"} />
                  {cp.Prefix.split("/").at(-2)}
                </SourceLink>
              </Box>
            );
          })}
          {resultState.listResult.Contents?.map((obj, i) => {
            const filename = obj.Key.split("/").at(-1);
            if (filename === "") {
              return <></>;
            }
            return (
              <Box key={`obj-${i}`}>
                <SourceLink href={`/${account_id}/${obj.Key}`}>
                  <Flex sx={{ justifyContent: "space-between" }}>
                    <Box sx={{ display: "inline" }}>
                      <FileIcon color={"primary"} />
                      <Text>{filename}</Text>
                    </Box>
                    <Text>{humanFileSize(obj.Size)}</Text>
                  </Flex>
                </SourceLink>
              </Box>
            );
          })}
        </Card>
        <Grid
          sx={{
            pt: 2,
            gridTemplateColumns: "auto auto",
          }}
        >
          <Box sx={{ textAlign: "left" }}>
            <SourceButton
              variant="primary"
              onClick={() => router.back()}
              disabled={!router.query.next}
            >
              Prev
            </SourceButton>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <SourceButton
              variant="primary"
              disabled={!resultState.listResult.IsTruncated}
              href={{
                query: {
                  ...router.query,
                  next: resultState.listResult.IsTruncated
                    ? resultState.listResult.NextContinuationToken
                    : null,
                },
              }}
            >
              Next
            </SourceButton>
          </Box>
        </Grid>
      </Box>
    );
  }

  if (resultState.object) {
    const objectUrl = `${process.env.NEXT_PUBLIC_S3_ENDPOINT}/${account_id}/${resultState.key}`;
    const objectFilename = resultState.key.split("/").at(-1);

    var viewer = null;

    if (objectFilename.endsWith(".pmtiles")) {
      const PMTilesViewer = dynamic(
        () => import("@/components/PMTilesViewer"),
        {
          ssr: false,
        }
      );
      viewer = <PMTilesViewer url={objectUrl} />;
    } else if (objectFilename.endsWith(".geojson")) {
      const GeoJSONViewer = dynamic(
        () => import("@/components/GeoJSONViewer"),
        {
          ssr: false,
        }
      );
      viewer = <GeoJSONViewer url={objectUrl} />;
    }

    return (
      <Box>
        <RepositoryBreadcrumbs
          account_id={account_id}
          repository_id={repository_id}
          prefix={slug}
          basePath={router.asPath}
        />
        <Box>
          <Heading as="h2">Details</Heading>
          <Card
            variant="code"
            sx={{ fontSize: 1, maxWidth: "fit-content", pr: 6 }}
          >
            <ul>
              <li>
                <Heading
                  as="h4"
                  sx={{ display: "inline", textTransform: "uppercase" }}
                >
                  Name:
                </Heading>{" "}
                {objectFilename}
              </li>
              <li>
                <Heading
                  as="h4"
                  sx={{ display: "inline", textTransform: "uppercase" }}
                >
                  URL:
                </Heading>{" "}
                <Link href={objectUrl}>
                  <Text sx={{ color: "primary", textDecoration: "underline" }}>
                    {objectUrl}
                  </Text>
                </Link>
              </li>
            </ul>
          </Card>
          <Button variant="primary" href={objectUrl} sx={{ mt: 2 }}>
            Download
          </Button>
        </Box>
        {viewer ? (
          <>
            <Heading as="h2">Preview</Heading>
            {viewer}
          </>
        ) : (
          <></>
        )}
      </Box>
    );
  }

  return <>Error loading page. Refresh to try again.</>;
}
