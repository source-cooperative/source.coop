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
- Improved error handling in auth forms
- Enhanced security by removing sensitive data from logs
- Streamlined registration flow to follow Ory best practices
- Improved form styling using Radix UI best practices
- Updated form components with larger text and better spacing
- Renamed functions to follow consistent snake_case naming convention for account identifiers
- Added graceful fallbacks for authentication API failures

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

## [0.1.0] - 2024-03-18

### Added
- Initial project setup
- Basic Next.js application structure
- Development environment configuration

[Unreleased]: https://github.com/source-cooperative/source.coop/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/source-cooperative/source.coop/releases/tag/v0.1.0 