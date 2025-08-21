# Authentication Architecture

## Overview
This document describes the authentication and authorization system used in the Source.coop platform, which is built on top of Ory Kratos.

## Authentication System

### Ory Kratos Integration
- User authentication
- Session management
- Identity verification
- Password policies

### Session Management
- HTTP-only cookies
- Secure session storage
- Session timeout handling
- Multi-device support

### Protected Routes
- Next.js middleware
- Route protection
- Role-based access
- API authentication

## Implementation Details

### Authentication Flow

#### Login Flow
```typescript
// 1. User submits credentials
const response = await kratos.submitLogin({
  email: string;
  password: string;
});

// 2. Kratos validates credentials
// 3. Session cookie is set
// 4. User is redirected to dashboard
```

#### Registration Flow
```typescript
// 1. User submits registration form
const response = await kratos.submitRegistration({
  email: string;
  password: string;
  name: string;
});

// 2. Kratos creates identity
// 3. Session is established
// 4. User is redirected to profile
```

### Session Management

#### Session Creation
```typescript
// Create session with Kratos
const session = await kratos.createSession({
  identity_id: string;
  expires_in?: number;
});

// Set session cookie
response.cookies.set('session', session.token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/'
});
```

#### Session Validation
```typescript
// Middleware session check
export async function middleware(request: NextRequest) {
  const session = await kratos.validateSession(request.cookies.get('session'));
  
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  return NextResponse.next();
}
```

## Authorization

### Role-Based Access Control

#### User Roles
```typescript
type UserRole = 
  | 'owner'      // Repository owner
  | 'admin'      // Repository administrator
  | 'member'     // Repository member
  | 'viewer';    // Repository viewer
```

#### Permission Matrix
```typescript
const PERMISSIONS = {
  admin: {
    read: true,
    write: true,
    delete: true,
    manage: true
  },
  contributor: {
    read: true,
    write: true,
    delete: false,
    manage: false
  },
  viewer: {
    read: true,
    write: false,
    delete: false,
    manage: false
  }
};
```

### Access Control Implementation

#### Route Protection
```typescript
// Protected API route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ repository_id: string }> }
) {
  const session = await kratos.validateSession(request.cookies.get('session'));
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const role = await getRepositoryRole(session.identity_id, params.repository_id);
  if (!hasPermission(role, 'read')) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Handle request
}
```

#### Component Protection
```typescript
// Protected component
export function ProtectedComponent({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  
  if (!session) {
    return <LoginPrompt />;
  }
  
  return <>{children}</>;
}
```

## Security Considerations

### Password Security
- Minimum length requirements
- Complexity requirements
- Password hashing
- Brute force protection

### Session Security
- Secure cookie settings
- CSRF protection
- XSS prevention
- Session timeout

### API Security
- Rate limiting
- Request validation
- Error handling
- Audit logging

## Future Enhancements

### Multi-Factor Authentication
- TOTP support
- SMS verification
- Email verification
- Backup codes

### OAuth Integration
- GitHub integration
- Google integration
- ORCID integration
- Custom providers

### Enterprise Features
- SSO support
- LDAP integration
- SAML support
- Custom identity providers

// Helper function to check permissions
function hasPermission(role: 'admin' | 'contributor' | 'viewer', permission: 'read' | 'write' | 'delete' | 'manage'): boolean {
  return PERMISSIONS[role][permission] || false;
} 