import '@testing-library/jest-dom';
import { jest } from "@jest/globals";
import React from "react";

// This file is used to set up the test environment
// It runs before each test file

// Mock the next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: {},
      asPath: '',
      push: jest.fn(),
      replace: jest.fn(),
    };
  },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Create a mock component factory
const mockComponent = (name: string) => {
  const component = (props: any) => {
    return { 
      $$typeof: Symbol.for('react.element'),
      type: name,
      props: { ...props },
      _owner: null,
      _store: {}
    };
  };
  component.displayName = name;
  return component;
};

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: mockComponent('Image'),
}));

// Mock next/link
jest.mock('next/link', () => {
  const React = require('react');
  const Link = React.forwardRef(function Link(
    {
      href,
      children,
      ...props
    }: { href?: string; children?: React.ReactNode; [key: string]: any },
    ref: React.ForwardedRef<HTMLAnchorElement>
  ) {
    return React.createElement("a", { href, ref, ...props }, children);
  });
  Link.displayName = "Link";
  return {
    __esModule: true,
    default: Link,
  };
});

// Add any global test setup here 