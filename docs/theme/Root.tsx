import React from 'react';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';

// Default implementation of the Docusaurus Root component
export default function Root({ children }): JSX.Element {
  return (
    <Theme appearance="light" accentColor="blue" grayColor="slate" radius="medium">
      {children}
    </Theme>
  );
} 