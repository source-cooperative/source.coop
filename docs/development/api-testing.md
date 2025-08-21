# API Testing Guide

This guide explains how to test the Source.coop API endpoints during local development, with a focus on authentication and security requirements.

## Prerequisites

Before testing any API endpoints, ensure you have:
1. A running local development environment
2. Valid authentication session (logged in through the UI)
3. Access to the Ory authentication server

## Authentication Requirements

The API uses a combination of:
- Ory session cookies for authentication
- CSRF tokens for security
- Authorization headers for API requests

### Getting Authentication Tokens

1. **Session Cookie**
   - Log in through the UI at `http://localhost:3000`
   - The session cookie will be automatically set

2. **CSRF Token**
   You can obtain the CSRF token in two ways:

   a. From the browser console:
   ```javascript
   const csrfToken = document.cookie
     .split('; ')
     .find(row => row.startsWith('csrf_token'))
     ?.split('=')[1];
   ```

   b. Using curl:
   ```bash
   curl -X GET http://localhost:3000/api/auth/session --cookie-jar cookies.txt
   ```

## Testing Account Management APIs

### Account Deletion

The account deletion endpoint (`DELETE /api/accounts/[account_id]`) requires proper authentication and CSRF protection.

#### Using curl

```bash
# 1. Get session and CSRF token
curl -X GET http://localhost:3000/api/auth/session --cookie-jar cookies.txt

# 2. Delete account
curl -X DELETE http://localhost:3000/api/accounts/your-account-id \
  --cookie cookies.txt \
  -H "x-csrf-token: YOUR_CSRF_TOKEN"
```

#### Using fetch (Browser Console)

```javascript
// Get CSRF token first
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf_token'))
  ?.split('=')[1];

// Delete account
await fetch('/api/accounts/your-account-id', {
  method: 'DELETE',
  headers: {
    'x-csrf-token': csrfToken
  },
  credentials: 'include' // Important! This sends the session cookie
});
```

### Expected Responses

#### Success
```json
{
  "success": true,
  "message": "Account deleted successfully",
  "deleted_by": "self"
}
```

#### Common Errors
```json
// No session
{ "error": "Unauthorized" }

// Missing CSRF token
{ "error": "CSRF token missing" }

// Wrong account
{ "error": "You can only delete your own account" }

// Account not found
{ "error": "Account not found" }
```

## Debugging Tips

### Authentication Issues

1. **Session Problems**
   - Clear your browser cookies
   - Log in again through the UI
   - Verify your session is valid:
     ```bash
     curl -X GET http://localhost:3000/api/auth/session
     ```

2. **CSRF Token Issues**
   - Ensure you're getting a fresh CSRF token
   - Verify the token is being sent in the correct header
   - Check that your session hasn't expired

3. **Ory Server Issues**
   - Check if the Ory server is running:
     ```bash
     docker ps | grep ory
     ```
   - Verify Ory server logs for any errors

### Network Debugging

1. Open your browser's DevTools (F12)
2. Go to the Network tab
3. Enable "Preserve log"
4. Make your API request
5. Inspect:
   - Request headers (especially cookies and CSRF token)
   - Response status and body
   - Any error messages in the console

## Best Practices

1. **Always Use HTTPS in Production**
   - Local development uses HTTP
   - Production requires HTTPS

2. **Keep Credentials Secure**
   - Never commit test credentials to version control
   - Use environment variables for sensitive data

3. **Test Error Cases**
   - Test with invalid tokens
   - Test with expired sessions
   - Test with missing required headers

4. **Clean Up Test Data**
   - Delete test accounts after testing
   - Clear test sessions when done

## Related Documentation

- [Development Setup](setup.md)
- [Authentication Guide](ory-authentication.md)
- [Testing Guidelines](testing.md)
- [DynamoDB Guide](dynamodb.md) 