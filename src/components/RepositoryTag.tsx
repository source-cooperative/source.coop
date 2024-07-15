import theme from "@/lib/theme";
import { Box, Text, Card } from "theme-ui";
import SourceLink from "@/components/SourceLink";
import { transparentize } from "@theme-ui/color";

const badgeColors = [
  {
    tags: ["Unlisted"],
    color: "yellow",
    disabled: true,
  },
  {
    tags: ["Private"],
    color: "orange",
    disabled: true,
  },
  {
    tags: ["Disabled"],
    color: "red",
    disabled: true,
  },
  {
    tags: ["Featured"],
    color: "green",
    disabled: true,
  }
];

export default function RepositoryTag({ tag }: { tag: any }) {
  var color = "primary";
  var link = true;
  for (var badge of badgeColors) {
    if (badge.tags.includes(tag)) {
      color = badge.color;
      if (badge.disabled) {
        link = false;
      }
      break;
    }
    
  }

  if (link) {
    return (
      <SourceLink variant="tag" href={"/repositories?tags=" + tag}>
        <Card variant="tag" sx={{
          color: color,
          backgroundColor: transparentize(color, 0.7),
          "&:hover": {
            backgroundColor: transparentize(color, 0.4),
          }}}>
          <Text variant="tag">{tag}</Text>
        </Card>
      </SourceLink>
    );
  } else {
    return (
      <Card variant="tag" sx={{
        color: color,
        backgroundColor: transparentize(color, 0.7),
        cursor: "default",
        display: "inline",
        ml: 2
      }}>
        <Text variant="tag">{tag}</Text>
      </Card>
    )
  }

  
}
