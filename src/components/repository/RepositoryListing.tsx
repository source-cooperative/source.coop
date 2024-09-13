import { Box, Paragraph, Heading, Flex, Text, Card, Link } from "theme-ui";
import SourceLink from "@/components/SourceLink";
import RepositoryTag from "@/components/repository/RepositoryTag";
import { useState } from "react";
import moment from "moment";
import Skeleton from "react-loading-skeleton";
import { Repository, RepositoryDataMode, RepositoryState } from "@/api/types";

export function RepositoryListing({
  repository,
  truncate,
}: {
  repository: Repository;
  truncate: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  var description,
    title,
    details,
    tags = null;
  var unlisted,
    priv,
    disabled,
    featured = false;

  if (repository) {
    const showExpandOption =
      truncate && repository.meta.description.length > 300;
    title = (
      <SourceLink
        sx={{ display: "inline" }}
        href={
          "/repositories/" +
          repository.account_id +
          "/" +
          repository.repository_id +
          "/description"
        }
      >
        {repository.meta.title}
      </SourceLink>
    );
    details = (
      <>
        Provided By{" "}
        <SourceLink href={"/" + repository.account_id}>
          {"@" + repository.account_id}
        </SourceLink>{" "}
        • Published on {moment(repository.published).format("MMMM DD, YYYY")}
      </>
    );
    tags = repository.meta.tags.map((tag, i) => {
      return tag.length > 0 ? (
        <RepositoryTag key={"tag-" + i} tag={tag} />
      ) : (
        <></>
      );
    });
    unlisted = repository.state === RepositoryState.Unlisted;
    priv = repository.data_mode === RepositoryDataMode.Private;
    disabled = repository.disabled;
    featured = repository.featured == 1;

    if (!showExpandOption) {
      description = repository.meta.description;
    } else {
      if (expanded) {
        description = (
          <>
            {repository.meta.description}{" "}
            <SourceLink
              variant="link"
              onClick={(e) => setExpanded(false)}
              sx={{ ml: 1, fontSize: 0 }}
            >
              [View Less]
            </SourceLink>
          </>
        );
      } else {
        description = (
          <>
            {repository.meta.description.substring(0, 300)}...{" "}
            <SourceLink
              variant="link"
              onClick={(e) => setExpanded(true)}
              sx={{ ml: 1, fontSize: 0 }}
            >
              [View More]
            </SourceLink>
          </>
        );
      }
    }
  }

  return (
    <Card
      key={
        repository
          ? repository.account_id + "/" + repository.repository_id
          : null
      }
      variant="listing"
    >
      <Heading variant="title">
        {title || <Skeleton />}
        {featured ? <RepositoryTag tag={"Featured"} /> : <></>}
        {unlisted ? <RepositoryTag tag={"Unlisted"} /> : <></>}
        {priv ? <RepositoryTag tag={"Private"} /> : <></>}
        {disabled ? <RepositoryTag tag={"Disabled"} /> : <></>}
      </Heading>
      <Paragraph variant="description">
        {description != null ? (
          repository.meta.description.length > 0 ? (
            description
          ) : (
            "No Description Provided"
          )
        ) : (
          <Skeleton count={2} />
        )}
      </Paragraph>
      <Text variant="detail">{details || <Skeleton />}</Text>
      <Flex sx={{ flexWrap: "wrap", gap: 2, mt: 1, alignItems: "center" }}>
        {tags != null ? tags : <Skeleton />}
      </Flex>
    </Card>
  );
}
