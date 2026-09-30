import { Text } from '@radix-ui/themes';
import { forwardRef, type ComponentProps } from 'react';

type MonoTextProps = ComponentProps<typeof Text>;

// forwardRef so Radix primitives (Tooltip, etc.) can anchor to it.
export const MonoText = forwardRef<HTMLSpanElement, MonoTextProps>(
  function MonoText(props, ref) {
    return (
      <Text ref={ref} {...props} style={{ fontFamily: 'var(--code-font-family)', ...props.style }} />
    );
  }
);
