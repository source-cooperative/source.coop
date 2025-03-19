import '@testing-library/jest-dom'

// Helper function to create elements without referencing React directly
const createElement = (type: string, props: any = {}, children?: any) => {
  const element = {
    $$typeof: Symbol.for('react.element'),
    type,
    props: { ...props },
    ref: null,
    key: null,
    _owner: null,
    _store: {}
  }
  if (children !== undefined) {
    element.props.children = children
  }
  return element
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/test-path',
    searchParams: new URLSearchParams()
  }),
  usePathname: () => '/test-path'
}))

// Mock next/headers
jest.mock('next/headers', () => ({
  __esModule: true,
  cookies: () => new Map(),
  headers: () => new Map()
}))

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: Object.assign(
    function Link({ href, children, ...props }) {
      return createElement('a', { href, ...props }, children)
    },
    { displayName: 'Link' }
  )
}))

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: function Image({ src, alt, ...props }) {
    return createElement('img', { src, alt, ...props })
  }
}))

// Mock @radix-ui/themes
jest.mock('@radix-ui/themes', () => ({
  __esModule: true,
  Container: ({ children, ...props }) => createElement('div', props, children),
  Box: ({ children, asChild, ...props }) => {
    if (asChild && children?.type) {
      return createElement(children.type, { ...children.props, ...props }, children.props.children)
    }
    return createElement('div', props, children)
  },
  Text: ({ children, ...props }) => createElement('span', props, children),
  Heading: ({ children, ...props }) => createElement('h2', props, children),
  Button: ({ children, ...props }) => createElement('button', props, children),
  Flex: ({ children, ...props }) => createElement('div', { ...props, role: 'group' }, children),
  Grid: ({ children, ...props }) => createElement('div', { ...props, role: 'grid' }, children),
  Card: ({ children, ...props }) => createElement('div', { ...props, role: 'article' }, children),
  Badge: ({ children, ...props }) => createElement('span', { ...props, role: 'status' }, children),
  Link: ({ children, href, ...props }) => createElement('a', { ...props, href }, children),
  Separator: ({ ...props }) => createElement('hr', props),
  Avatar: {
    Root: ({ children, ...props }) => createElement('span', { ...props, role: 'img' }, children),
    Image: ({ src, alt, ...props }) => createElement('img', { ...props, src, alt }),
    Fallback: ({ children, ...props }) => createElement('span', props, children)
  },
  DataList: {
    Root: ({ children, ...props }) => createElement('dl', props, children),
    Item: ({ children, ...props }) => createElement('div', props, children),
    Label: ({ children, minWidth, ...props }) => createElement('dt', { ...props, style: { minWidth } }, children),
    Value: ({ children, ...props }) => createElement('dd', props, children)
  },
  Dialog: {
    Root: ({ children, onOpenChange, ...props }) => createElement('div', { 
      ...props, 
      role: 'dialog',
      'aria-labelledby': 'dialog-title',
      'aria-describedby': 'dialog-description',
      onClick: onOpenChange ? (e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false)
        }
      } : undefined
    }, children),
    Content: ({ children, asChild, ...props }) => createElement('div', { 
      ...props, 
      role: 'document',
      'aria-modal': true
    }, children),
    Title: ({ children, asChild, ...props }) => createElement('h2', { 
      ...props, 
      id: 'dialog-title'
    }, children),
    Description: ({ children, asChild, ...props }) => createElement('p', { 
      ...props, 
      id: 'dialog-description'
    }, children),
    Close: ({ children, asChild, ...props }) => createElement('button', { 
      ...props, 
      'aria-label': 'Close dialog'
    }, children)
  },
  Table: {
    Root: ({ children, ...props }) => createElement('table', { ...props, role: 'table' }, children),
    Header: ({ children, ...props }) => createElement('thead', { ...props, role: 'rowgroup' }, children),
    Body: ({ children, ...props }) => createElement('tbody', { ...props, role: 'rowgroup' }, children),
    Row: ({ children, ...props }) => createElement('tr', { ...props, role: 'row' }, children),
    Cell: ({ children, ...props }) => createElement('td', { ...props, role: 'cell' }, children),
    ColumnHeaderCell: ({ children, ...props }) => createElement('th', { ...props, role: 'columnheader' }, children)
  }
}))

// Mock @radix-ui/react-icons
jest.mock('@radix-ui/react-icons', () => ({
  __esModule: true,
  FileIcon: function FileIcon(props) {
    return createElement('svg', { role: 'img', 'aria-label': 'file', ...props })
  },
  ChevronRightIcon: function ChevronRightIcon(props) {
    return createElement('svg', { role: 'img', 'aria-label': 'chevron right', ...props })
  },
  SlashIcon: function SlashIcon(props) {
    return createElement('svg', { role: 'img', 'aria-label': 'slash', ...props })
  },
  CheckCircledIcon: function CheckCircledIcon(props) {
    return createElement('svg', { role: 'img', 'aria-label': 'check', ...props })
  },
  CrossCircledIcon: function CrossCircledIcon(props) {
    return createElement('svg', { role: 'img', 'aria-label': 'cross', ...props })
  },
  UpdateIcon: function UpdateIcon(props) {
    return createElement('svg', { role: 'img', 'aria-label': 'update', ...props })
  }
})) 