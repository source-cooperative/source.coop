"use client";
import NextLink from "next/link";
import { Flex, Text, Progress, IconButton, Link } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import { productUrl } from "@/lib/urls";
import type { DeleteJob } from "./UploadProvider";

const count = (n: number) =>
  `${n.toLocaleString()} ${n === 1 ? "file" : "files"}`;

/** One line describing where a delete has got to. */
export function deleteStatusText(
  job: Pick<DeleteJob, "status" | "counting" | "deleted" | "total">
): string {
  if (job.status === "completed") return `Deleted ${count(job.deleted)}`;
  if (job.counting)
    return `Counting files… ${job.total.toLocaleString()} found`;
  return `Deleted ${job.deleted.toLocaleString()} of ${count(job.total)}`;
}

interface DeleteProgressProps {
  job: DeleteJob;
  /** Shown for a failed delete, to clear it from the list. */
  onDismiss?: () => void;
}

/** A background delete's name, product, progress and any error. */
export function DeleteProgress({ job, onDismiss }: DeleteProgressProps) {
  const product = productUrl(job.scope.accountId, job.scope.productId);
  const parent = job.path.replace(/\/$/, "").split("/").slice(0, -1).join("/");
  const name = job.path.replace(/\/$/, "").split("/").pop();
  return (
    <Flex
      direction="column"
      gap="2"
      style={{
        padding: "var(--space-2)",
        backgroundColor: "var(--gray-2)",
        borderRadius: "var(--radius-2)",
      }}
    >
      <Flex justify="between" align="start">
        <Flex direction="column" style={{ flex: 1, minWidth: 0 }}>
          <Text size="2" weight="medium" truncate>
            {name}
            {job.isDirectory ? "/" : ""}
          </Text>
          <Link size="1" color="gray" asChild>
            <NextLink href={`${product}/${parent}`}>
              {product}/{parent}
            </NextLink>
          </Link>
        </Flex>
        {job.status === "error" && onDismiss && (
          <IconButton
            size="1"
            variant="ghost"
            color="gray"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <Cross2Icon />
          </IconButton>
        )}
      </Flex>
      <Text size="1" color="gray">
        {deleteStatusText(job)}
      </Text>
      {job.status === "deleting" && (
        <Progress
          size="1"
          color="red"
          // Indeterminate until the listing finishes and the total is known.
          value={
            job.counting || !job.total
              ? undefined
              : (job.deleted / job.total) * 100
          }
        />
      )}
      {job.error && (
        <Text size="1" color="red">
          {job.error}
        </Text>
      )}
    </Flex>
  );
}
