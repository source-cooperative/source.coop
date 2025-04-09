'use client';

import { Dialog, Box, Text, Table } from '@radix-ui/themes';

interface ShortcutHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: 'repository-list' | 'product-list' | 'object-browser' | 'object-details';
}

interface ShortcutItem {
  key: string;
  action: string;
}

const GLOBAL_SHORTCUTS: ShortcutItem[] = [
  { key: '?', action: 'Show/hide this help dialog' },
  { key: 'g h', action: 'Go to homepage' },
];

const REPOSITORY_LIST_SHORTCUTS: ShortcutItem[] = [
  { key: '↑ / k', action: 'Navigate up' },
  { key: '↓ / j', action: 'Navigate down' },
  { key: 'Enter / o', action: 'Open selected repository' },
  { key: 'c', action: 'Copy URL of selected repository' },
  { key: 'Shift+Escape', action: 'Clear selection' },
];

const OBJECT_BROWSER_SHORTCUTS: ShortcutItem[] = [
  { key: '↑ / k', action: 'Navigate up' },
  { key: '↓ / j', action: 'Navigate down' },
  { key: 'Enter / o', action: 'Open selected item' },
  { key: 'c', action: 'Copy URL of selected item' },
  { key: '~', action: 'Go up one level' },
  { key: 'Shift+Escape', action: 'Clear selection' },
];

const OBJECT_DETAILS_SHORTCUTS: ShortcutItem[] = [
  { key: '↑ / k', action: 'Navigate up through properties' },
  { key: '↓ / j', action: 'Navigate down through properties' },
  { key: 'c', action: 'Copy selected property value' },
  { key: '~', action: 'Return to directory view' },
];

export function ShortcutHelp({ open, onOpenChange, context }: ShortcutHelpProps) {
  const contextShortcuts = (() => {
    switch (context) {
      case 'repository-list':
      case 'product-list':
        return REPOSITORY_LIST_SHORTCUTS;
      case 'object-browser':
        return OBJECT_BROWSER_SHORTCUTS;
      case 'object-details':
        return OBJECT_DETAILS_SHORTCUTS;
      default:
        return [];
    }
  })();

  const description = `Keyboard shortcuts for ${context.replace('-', ' ')}. Use these shortcuts to navigate and interact with the interface.`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="3">
        <Dialog.Title>Keyboard Shortcuts</Dialog.Title>
        <Dialog.Description>
          {description}
        </Dialog.Description>
        <Box py="4">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Key</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {GLOBAL_SHORTCUTS.map((shortcut) => (
                <Table.Row key={shortcut.key}>
                  <Table.Cell>{shortcut.key}</Table.Cell>
                  <Table.Cell>{shortcut.action}</Table.Cell>
                </Table.Row>
              ))}
              {contextShortcuts.map((shortcut) => (
                <Table.Row key={shortcut.key}>
                  <Table.Cell>{shortcut.key}</Table.Cell>
                  <Table.Cell>{shortcut.action}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
        <Dialog.Close>
          <Text size="2" color="gray">Press Escape to close</Text>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  );
} 