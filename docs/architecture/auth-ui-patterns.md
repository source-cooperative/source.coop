# Authentication UI Patterns

## Form Design Principles

Our authentication forms follow these core principles:

1. **Clean and Focused UI**
   - Use Radix UI components for consistent styling
   - Keep forms simple and distraction-free
   - Maintain clear visual hierarchy
   - Use monospaced font (Berkeley Mono) for input fields

2. **Accessibility First**
   - Logical tab order through form fields only
   - Auto-focus on primary input field when form loads
   - Clear error messages with proper ARIA attributes
   - Keyboard navigation support

3. **Consistent User Experience**
   - Matching styles between Login and Registration forms
   - Predictable form behavior across all states
   - Clear loading and error states
   - Proper form validation feedback

## Implementation Example

Here's our standard authentication form implementation using Radix UI:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button, Flex, Text, Box, TextField } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { Configuration, FrontendApi } from '@ory/client';

// Initialize Ory client
const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4000',
    baseOptions: {
      withCredentials: true,
    }
  })
);

export function AuthForm() {
  // Form state management
  const [flow, setFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize flow on mount
  useEffect(() => {
    const initFlow = async () => {
      try {
        const { data } = await ory.createBrowserLoginFlow();
        setFlow(data);
        setError(null);
      } catch (err) {
        setError('Could not initialize. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    initFlow();
  }, []);

  return (
    <Form.Root onSubmit={handleSubmit} style={{ outline: 'none' }}>
      <Flex direction="column" gap="4">
        {/* Email Field */}
        <Form.Field name="identifier">
          <Form.Label>
            <Text size="3" weight="medium">Email</Text>
          </Form.Label>
          <TextField.Root 
            type="email"
            placeholder="you@example.com"
            required
            size="3"
            variant="surface"
            style={{ fontFamily: 'Berkeley Mono' }}
            autoFocus
          />
          <Form.Message match="valueMissing">
            <Text color="red" size="1">Please enter your email</Text>
          </Form.Message>
        </Form.Field>

        {/* Password Field */}
        <Form.Field name="password">
          <Form.Label>
            <Text size="3" weight="medium">Password</Text>
          </Form.Label>
          <TextField.Root 
            type="password"
            placeholder="********"
            required
            size="3"
            variant="surface"
            style={{ fontFamily: 'Berkeley Mono' }}
          />
          <Form.Message match="valueMissing">
            <Text color="red" size="1">Please enter your password</Text>
          </Form.Message>
        </Form.Field>

        {/* Submit Button - removed from tab order */}
        <Flex mt="4" justify="end">
          <Form.Submit asChild>
            <Button size="3" type="submit" disabled={loading} tabIndex={-1}>
              {loading ? 'Processing...' : 'Submit'}
            </Button>
          </Form.Submit>
        </Flex>
      </Flex>
    </Form.Root>
  );
}
```

## Key Features

1. **Form Structure**
   - Clear component hierarchy using Radix UI's Form components
   - Consistent spacing and layout using Flex components
   - Proper form field labeling and validation messages

2. **Input Fields**
   - Use `TextField.Root` for consistent styling
   - Berkeley Mono font for better readability
   - Proper size and variant props for visual consistency
   - Auto-focus on primary input field

3. **Navigation**
   - Tab order limited to input fields only
   - Buttons removed from tab order using `tabIndex={-1}`
   - Form wrapper doesn't receive focus outline

4. **Error Handling**
   - Clear error messages with proper styling
   - Form-level and field-level validation
   - Loading states properly managed

## Best Practices

1. **Form Initialization**
   - Initialize authentication flows on component mount
   - Handle loading and error states appropriately
   - Clear error messages on flow changes

2. **Styling**
   - Use Radix UI theme tokens for consistency
   - Apply Berkeley Mono font to input fields
   - Maintain consistent spacing using theme values

3. **Accessibility**
   - Maintain logical tab order
   - Use proper ARIA labels
   - Provide clear error feedback
   - Support keyboard navigation

4. **Error States**
   - Display user-friendly error messages
   - Provide clear recovery actions
   - Maintain form state during errors

This pattern aligns with our [CURSOR_RULES.md](../CURSOR_RULES.md) guidelines for:
- Server-First Architecture
- UI/UX Preservation
- Trust the Platform (Radix UI)
- Component Structure
- Error Handling 