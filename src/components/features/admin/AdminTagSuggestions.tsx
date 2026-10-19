import Link from "next/link";
import { Badge, Button, Card, Flex, Select, Text } from "@radix-ui/themes";
import { productUrl } from "@/lib/urls";
import { TAG_CATEGORIES } from "@/lib/tags/categories";

export interface TagSuggestion {
  tag: string;
  suggested_by?: string;
  suggested_at?: string;
  /** Products carrying the tag now, which a merge or rejection rewrites. */
  products: { account_id: string; product_id: string }[];
}

interface AdminTagSuggestionsProps {
  suggestions: TagSuggestion[];
  /** Approved tags, any of which a suggestion can be merged into. */
  approved: string[];
  /** Applies the decision a review form submits. */
  action: (formData: FormData) => Promise<void>;
}

export function AdminTagSuggestions({
  suggestions,
  approved,
  action,
}: AdminTagSuggestionsProps) {
  if (!suggestions.length) {
    return (
      <Text size="2" color="gray">
        No tags are waiting for review.
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="3">
      {suggestions.map(({ tag, suggested_by, suggested_at, products }) => (
        <Card key={tag}>
          <Flex direction="column" gap="3">
            <Flex gap="2" align="baseline" wrap="wrap">
              <Badge color="amber" size="2">
                {tag}
              </Badge>
              <Text size="1" color="gray">
                Suggested by {suggested_by ?? "unknown"}
                {suggested_at &&
                  ` on ${new Date(suggested_at).toLocaleDateString("en-US", { dateStyle: "medium" })}`}
              </Text>
            </Flex>
            <Text size="2">
              {products.length ? (
                <>
                  On{" "}
                  {products.map((p, i) => (
                    <span key={`${p.account_id}/${p.product_id}`}>
                      {i > 0 && ", "}
                      <Link href={productUrl(p.account_id, p.product_id)}>
                        {p.account_id}/{p.product_id}
                      </Link>
                    </span>
                  ))}
                </>
              ) : (
                "Not on any product."
              )}
            </Text>
            {/* One form per decision, so each can require its own choice. */}
            <Flex gap="4" align="center" wrap="wrap">
              <ReviewForm tag={tag} decision="approve" action={action}>
                <Select.Root name="category" size="1" required>
                  <Select.Trigger placeholder="Category…" />
                  <Select.Content>
                    {TAG_CATEGORIES.map((c) => (
                      <Select.Item key={c.id} value={c.id}>
                        {c.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <Button size="1">Approve</Button>
              </ReviewForm>
              <ReviewForm tag={tag} decision="merge" action={action}>
                <Select.Root name="into" size="1" required>
                  <Select.Trigger placeholder="Merge into…" />
                  <Select.Content>
                    {approved.map((t) => (
                      <Select.Item key={t} value={t}>
                        {t}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <Button size="1" variant="soft">
                  Merge
                </Button>
              </ReviewForm>
              <ReviewForm tag={tag} decision="reject" action={action}>
                <Button size="1" variant="soft" color="red">
                  Reject
                </Button>
              </ReviewForm>
            </Flex>
          </Flex>
        </Card>
      ))}
    </Flex>
  );
}

function ReviewForm({
  tag,
  decision,
  action,
  children,
}: {
  tag: string;
  decision: "approve" | "merge" | "reject";
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="tag" value={tag} />
      <input type="hidden" name="decision" value={decision} />
      <Flex gap="2" align="center">
        {children}
      </Flex>
    </form>
  );
}
