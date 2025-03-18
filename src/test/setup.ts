// Mock process.env for tests
beforeAll(() => {
  const env = process.env;
  jest.resetModules();
  process.env = { ...env, NODE_ENV: 'development' };
});

afterAll(() => {
  process.env = process.env;
});

// Mock Next.js Request and Response objects
global.Request = jest.fn(() => ({
  json: jest.fn(),
  headers: new Map(),
  url: '',
})) as unknown as typeof Request;

global.Response = jest.fn(() => ({
  json: jest.fn(),
  headers: new Map(),
  status: 200,
})) as unknown as typeof Response;

// Mock Next.js headers and cookies
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
  headers: () => ({
    get: jest.fn(),
    set: jest.fn(),
  }),
}));

// Mock Next.js server components
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
})); 