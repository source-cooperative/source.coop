import { Text } from '@radix-ui/themes';
import type { ComponentProps } from 'react';

type MonoTextProps = ComponentProps<typeof Text>;

export function MonoText(props: MonoTextProps) {
  return (
    <Text {...props} style={{ fontFamily: 'var(--code-font-family)', ...props.style }} />
  );
} 