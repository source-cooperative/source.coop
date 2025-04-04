// jest.setup.ts
import '@testing-library/jest-dom';
import { jest } from "@jest/globals";

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
})); 