# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Progress towards 0.2.0:
- [x] Authentication system using Ory Kratos
- [x] Basic user session management
- [ ] Local DynamoDB setup for development
- [ ] Complete user profile management
- [ ] Repository management interfaces
- [ ] Organization creation and management
- [ ] User-organization relationship management

### Added
- Authentication system using Ory Kratos
  - Login and registration flows
  - Session management
  - Protected routes and auth middleware
  - Onboarding flow after registration
- Core components
  - Form component with validation
  - Navigation component with auth state
  - Auth pages (login, registration)
- API routes
  - Session management endpoint
  - Logout endpoint
  - RSS feed endpoint for public repositories
- Infrastructure
  - Logger implementation with structured logging
  - Error handling system
  - Type definitions for forms and storage
  - Test infrastructure setup
- Documentation
  - Data proxy requirements
  - Project improvements roadmap
  - Ory configuration guide

### Changed
- Updated project structure for Next.js 13+ conventions
- Enhanced test coverage for auth components and routes
- Refactored auth page into server and client components
  - Improved architecture with server components for initial rendering
  - Added client components for interactive elements
  - Implemented optimized tab interface with conditional rendering
- Enhanced security by removing sensitive data from logs
- Streamlined registration flow to follow Ory best practices
- Improved form styling using Radix UI best practices
- Updated form components with larger text and better spacing
- Renamed functions to follow consistent snake_case naming convention for account identifiers
- Added graceful fallbacks for authentication API failures
- Improved error handling in auth forms with better user feedback
- Optimized authentication form performance with conditional mounting
- Simplified authentication implementation:
  - Switched to direct Ory SDK usage in client components
  - Removed unnecessary API proxy routes for authentication
  - Updated authentication documentation with new best practices
  - Improved Next.js 15+ compatibility by properly awaiting searchParams
- Improved onboarding form UX:
  - Added debounced username validation to reduce API calls
  - Enhanced visual feedback for username availability
  - Prevented layout shifts during validation
  - Consolidated status messages in a stable location

### Fixed
- NextResponse handling in auth route tests
- Session management edge cases
- React hooks dependency warnings in auth forms
- Registration flow redirection issues
- CSRF token handling in auth forms
- Form validation and error display
- Error handling during registration and login flow initialization
- Flow verification failures with improved fallback mechanisms
- Ory API connectivity issues with direct form submission fallback
- Layout issues with authentication forms
- Proper form text sizing and input field styling
- Authentication CSRF token issues:
  - Rewrote API routes for login and registration with proper cookie handling
  - Added multi-layer fallback mechanisms with automatic retries
  - Implemented smart cookie forwarding to preserve authentication state
  - Added "Clear Cookies" button for manual recovery from CSRF issues
  - Improved error logging and user-friendly error messages
  - Fixed server/client context detection for proper URL construction
  - Added cache control headers to prevent stale responses
- Next.js searchParams handling in auth page component
- Resolved Ory authentication CSRF token violations:
  - Simplified authentication flow to always create new flows via API endpoints
  - Implemented safe cookie handling to avoid toUTCString errors
  - Combined flow creation and data fetching in API routes
  - Added detailed documentation in docs/development/ory-authentication.md
- Fixed CORS issues with authentication flows:
  - Added URL proxy mechanism to redirect Ory API requests through localhost:4000
  - Updated registration and login forms to use local proxy for form submissions
  - Modified API routes to properly handle and rewrite Ory URLs
  - Ensured all communication with Ory happens exclusively through the local tunnel
- Authentication error recovery:
  - Added clearer error messages for authentication failures
  - Implemented automatic retry mechanisms with backoff
  - Added self-healing for common authentication issues
  - Improved form state preservation during error recovery
- Fixed duplicate authentication flow initializations:
  - Converted auth page to a server component with client-side tab interface
  - Implemented conditional rendering to only load active form components
  - Added initialization state tracking to prevent duplicate calls in React Strict Mode
  - Improved performance by eliminating unnecessary API calls
- Fixed registration form submission issues:
  - Removed code that modified form action URLs from localhost:4000 to localhost:3000
  - Ensured forms submit directly to Ory endpoints without modification
  - Used the Ory SDK directly for all authentication operations
  - Simplified the authentication flow by removing unnecessary proxies

## [0.1.0] - 2024-03-18

### Added
- Initial project setup
- Basic Next.js application structure
- Development environment configuration

[Unreleased]: https://github.com/source-cooperative/source.coop/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/source-cooperative/source.coop/releases/tag/v0.1.0 