"use client";

import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Code,
  Flex,
  Heading,
  Text,
} from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import {
  planDelete,
  planDisable,
  type LifecyclePlan,
  type ServiceAccountFormValues,
} from "./plan";

type Pending = "disable" | "enable" | "delete";

/**
 * Disable and delete for an existing service account. Like the rest of the
 * mock it changes nothing — confirming shows the rows the action would touch
 * and, more usefully, when access actually stops.
 */
export function DangerZone({
  values,
  disabled,
}: {
  values: ServiceAccountFormValues;
  disabled: boolean;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [result, setResult] = useState<{
    action: Pending;
    plan: LifecyclePlan;
  } | null>(null);

  function confirm(action: Pending) {
    setResult({
      action,
      plan:
        action === "delete"
          ? planDelete(values)
          : planDisable(values, action === "disable"),
    });
    setPending(null);
  }

  return (
    <Card mt="5">
      <Heading size="3" mb="1" color="red">
        Danger zone
      </Heading>
      <Text size="2" color="gray">
        Both actions affect software that is running right now.
      </Text>

      <Flex direction="column" gap="4" mt="4">
        <Flex justify="between" align="center" gap="3" wrap="wrap">
          <Box>
            <Text size="2" weight="medium">
              {disabled ? "Enable this service account" : "Disable this service account"}
            </Text>
            <br />
            <Text size="1" color="gray">
              {disabled
                ? "Sign-in methods start working again, with the grants already recorded."
                : "Stops all sign-in methods but keeps every grant, so it can be turned back on unchanged."}
            </Text>
          </Box>
          {pending === (disabled ? "enable" : "disable") ? (
            <Flex gap="2">
              <Button
                type="button"
                color={disabled ? "green" : "amber"}
                onClick={() => confirm(disabled ? "enable" : "disable")}
              >
                Confirm
              </Button>
              <Button
                type="button"
                variant="soft"
                color="gray"
                onClick={() => setPending(null)}
              >
                Cancel
              </Button>
            </Flex>
          ) : (
            <Button
              type="button"
              variant="soft"
              color={disabled ? "green" : "amber"}
              onClick={() => setPending(disabled ? "enable" : "disable")}
            >
              {disabled ? "Enable" : "Disable"}
            </Button>
          )}
        </Flex>

        <Flex justify="between" align="center" gap="3" wrap="wrap">
          <Box>
            <Text size="2" weight="medium">
              Delete this service account
            </Text>
            <br />
            <Text size="1" color="gray">
              Removes the account, every sign-in method and every grant. The id
              cannot be reused.
            </Text>
          </Box>
          {pending === "delete" ? (
            <Flex gap="2" align="center" wrap="wrap">
              <Text size="1" color="red">
                Delete <Code>{values.name}</Code>?
              </Text>
              <Button type="button" color="red" onClick={() => confirm("delete")}>
                Yes, delete
              </Button>
              <Button
                type="button"
                variant="soft"
                color="gray"
                onClick={() => setPending(null)}
              >
                Cancel
              </Button>
            </Flex>
          ) : (
            <Button
              type="button"
              variant="soft"
              color="red"
              onClick={() => setPending("delete")}
            >
              Delete
            </Button>
          )}
        </Flex>
      </Flex>

      {result && (
        <Box mt="4">
          <Callout.Root color={result.action === "delete" ? "red" : "amber"}>
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              <Flex direction="column" gap="3">
                <Text size="2" weight="medium">
                  Nothing was changed — this is what{" "}
                  {result.action === "delete" ? "deleting" : `${result.action}ing`} would do.
                </Text>

                <Flex direction="column" gap="1">
                  {result.plan.changes.map((change) => (
                    <Text size="2" key={`${change.table}-${change.detail}`}>
                      <Badge
                        color={change.operation === "delete" ? "red" : "amber"}
                        variant="soft"
                      >
                        {change.operation}
                      </Badge>{" "}
                      <Code size="1">{change.table}</Code> — {change.detail}
                    </Text>
                  ))}
                </Flex>

                <Flex direction="column" gap="1">
                  {result.plan.effects.map((effect) => (
                    <Text size="1" color="gray" key={effect}>
                      {effect}
                    </Text>
                  ))}
                </Flex>
              </Flex>
            </Callout.Text>
          </Callout.Root>
        </Box>
      )}
    </Card>
  );
}
