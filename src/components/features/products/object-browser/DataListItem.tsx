import { DataList, Flex, IconButton, Tooltip } from "@radix-ui/themes";
import { CopyIcon, CheckIcon } from "@radix-ui/react-icons";
import { MonoText } from "@/components/core";
import styles from "./ObjectBrowser.module.css";

interface DataListItemProps {
  label: string;
  value: string | React.ReactNode;
  selectedDataItem: string | null;
  itemKey: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}

export function DataListItem({
  label,
  value,
  selectedDataItem,
  itemKey,
  copiedField,
  onCopy,
}: DataListItemProps) {
  return (
    <DataList.Item>
      <DataList.Label minWidth="120px">{label}</DataList.Label>
      <DataList.Value>
        <Flex align="center" gap="2">
          <MonoText
            className={styles.selectableText}
            data-selected={selectedDataItem === itemKey}
            data-selectable="true"
            data-item={itemKey}
          >
            {value}
          </MonoText>
          <Tooltip content="Copy to clipboard">
            <IconButton
              size="1"
              variant="ghost"
              color={copiedField === itemKey ? "green" : "gray"}
              onClick={() =>
                onCopy(typeof value === "string" ? value : "", itemKey)
              }
              aria-label={`Copy ${label.toLowerCase()}`}
            >
              {copiedField === itemKey ? <CheckIcon /> : <CopyIcon />}
            </IconButton>
          </Tooltip>
        </Flex>
      </DataList.Value>
    </DataList.Item>
  );
}
