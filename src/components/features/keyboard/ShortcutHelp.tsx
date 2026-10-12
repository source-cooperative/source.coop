'use client';

import { Dialog, Box, Text, Table } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';

interface ShortcutHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: 'product-list' | 'object-browser' | 'object-details';
}

type ShortcutAction =
  | 'toggleHelp'
  | 'goHome'
  | 'navigateUp'
  | 'navigateDown'
  | 'openSelectedProduct'
  | 'copySelectedProductUrl'
  | 'clearSelection'
  | 'openSelectedItem'
  | 'copySelectedItemUrl'
  | 'goUpOneLevel'
  | 'navigateUpProperties'
  | 'navigateDownProperties'
  | 'copySelectedPropertyValue'
  | 'returnToDirectoryView';

interface ShortcutItem {
  key: string;
  action: ShortcutAction;
}

const GLOBAL_SHORTCUTS: ShortcutItem[] = [
  { key: '?', action: 'toggleHelp' },
  { key: 'g h', action: 'goHome' },
];

const PRODUCT_LIST_SHORTCUTS: ShortcutItem[] = [
  { key: '↑ / k', action: 'navigateUp' },
  { key: '↓ / j', action: 'navigateDown' },
  { key: 'Enter / o', action: 'openSelectedProduct' },
  { key: 'c', action: 'copySelectedProductUrl' },
  { key: 'Shift+Escape', action: 'clearSelection' },
];

const OBJECT_BROWSER_SHORTCUTS: ShortcutItem[] = [
  { key: '↑ / k', action: 'navigateUp' },
  { key: '↓ / j', action: 'navigateDown' },
  { key: 'Enter / o', action: 'openSelectedItem' },
  { key: 'c', action: 'copySelectedItemUrl' },
  { key: '~', action: 'goUpOneLevel' },
  { key: 'Shift+Escape', action: 'clearSelection' },
];

const DESCRIPTION_KEYS = {
  'product-list': 'descriptionProductList',
  'object-browser': 'descriptionObjectBrowser',
  'object-details': 'descriptionObjectDetails',
} as const;

const OBJECT_DETAILS_SHORTCUTS: ShortcutItem[] = [
  { key: '↑ / k', action: 'navigateUpProperties' },
  { key: '↓ / j', action: 'navigateDownProperties' },
  { key: 'c', action: 'copySelectedPropertyValue' },
  { key: '~', action: 'returnToDirectoryView' },
];

export function ShortcutHelp({ open, onOpenChange, context }: ShortcutHelpProps) {
  const t = useTranslations('ShortcutHelp');
  const contextShortcuts = (() => {
    switch (context) {
      case 'product-list':
        return PRODUCT_LIST_SHORTCUTS;
      case 'object-browser':
        return OBJECT_BROWSER_SHORTCUTS;
      case 'object-details':
        return OBJECT_DETAILS_SHORTCUTS;
      default:
        return [];
    }
  })();

  const description = t(DESCRIPTION_KEYS[context]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="3">
        <Dialog.Title>{t('title')}</Dialog.Title>
        <Dialog.Description>
          {description}
        </Dialog.Description>
        <Box py="4">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>{t('keyHeader')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t('actionHeader')}</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {GLOBAL_SHORTCUTS.map((shortcut) => (
                <Table.Row key={shortcut.key}>
                  <Table.Cell>{shortcut.key}</Table.Cell>
                  <Table.Cell>{t(shortcut.action)}</Table.Cell>
                </Table.Row>
              ))}
              {contextShortcuts.map((shortcut) => (
                <Table.Row key={shortcut.key}>
                  <Table.Cell>{shortcut.key}</Table.Cell>
                  <Table.Cell>{t(shortcut.action)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
        <Dialog.Close>
          <Text size="2" color="gray">{t('pressEscapeToClose')}</Text>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  );
} 