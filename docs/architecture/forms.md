# Form Implementation with Radix UI

## Overview
Source.coop uses Radix UI components for all form elements to ensure consistent styling, accessibility, and behavior across the application.

## Core Principles

### 1. Component Selection
- Use Radix UI's form primitives:
  - `TextField` for single-line inputs
  - `TextArea` for multi-line inputs
  - `Select` for dropdowns
  - `Checkbox` for boolean inputs
  - `RadioGroup` for mutually exclusive options
  - `Switch` for toggle inputs
  - `Label` for form field labels
  - `ErrorMessage` for validation feedback

### 2. Form Structure
```typescript
import { TextField, TextArea, Label, ErrorMessage } from '@radix-ui/themes';

export function Form() {
  return (
    <form>
      <TextField.Root>
        <TextField.Input />
        <TextField.Slot>
          {/* Optional icons or buttons */}
        </TextField.Slot>
      </TextField.Root>
      
      <TextArea />
      
      <Label>Field Label</Label>
      <ErrorMessage>Error message</ErrorMessage>
    </form>
  );
}
```

### 3. Validation
- Use HTML5 validation attributes
- Implement client-side validation
- Show validation errors using `ErrorMessage`
- Handle form submission with proper error states

### 4. Accessibility
- Always include `Label` components
- Use proper ARIA attributes
- Maintain keyboard navigation
- Support screen readers
- Handle focus management

## Best Practices

### 1. Component Usage
```typescript
// ✅ Correct: Using Radix UI components
<TextField.Root>
  <TextField.Input
    type="text"
    placeholder="Enter text"
    required
  />
</TextField.Root>

// ❌ Incorrect: Using native HTML
<input type="text" placeholder="Enter text" required />
```

### 2. Form Layout
```typescript
// ✅ Correct: Proper form structure
<form>
  <Box mb="4">
    <Label htmlFor="name">Name</Label>
    <TextField.Root>
      <TextField.Input id="name" />
    </TextField.Root>
    <ErrorMessage>Name is required</ErrorMessage>
  </Box>
</form>

// ❌ Incorrect: Missing structure
<form>
  <input id="name" />
  <span>Name is required</span>
</form>
```

### 3. State Management
```typescript
// ✅ Correct: Using controlled components
const [value, setValue] = useState('');

<TextField.Root>
  <TextField.Input
    value={value}
    onChange={(e) => setValue(e.target.value)}
  />
</TextField.Root>

// ❌ Incorrect: Uncontrolled components
<TextField.Root>
  <TextField.Input defaultValue="initial" />
</TextField.Root>
```

### 4. Error Handling
```typescript
// ✅ Correct: Proper error display
<Box mb="4">
  <TextField.Root>
    <TextField.Input
      aria-invalid={!!error}
      aria-describedby={error ? 'error-message' : undefined}
    />
  </TextField.Root>
  {error && (
    <ErrorMessage id="error-message">
      {error}
    </ErrorMessage>
  )}
</Box>

// ❌ Incorrect: Missing error handling
<TextField.Root>
  <TextField.Input />
</TextField.Root>
```

## Implementation Guidelines

### 1. Form Components
- Create reusable form components
- Maintain consistent spacing
- Use theme tokens for styling
- Support both light and dark modes
- Handle loading states

### 2. Validation Rules
- Required fields
- Format validation
- Custom validation rules
- Async validation
- Cross-field validation

### 3. Error States
- Field-level errors
- Form-level errors
- Network errors
- Server errors
- Validation errors

### 4. Accessibility Features
- Focus management
- Keyboard navigation
- Screen reader support
- Error announcements
- Loading states

## Testing Requirements

### 1. Component Testing
- Test all form states
- Verify validation
- Check error handling
- Test keyboard navigation
- Verify accessibility

### 2. Integration Testing
- Test form submission
- Verify data handling
- Check error states
- Test loading states
- Verify redirects

### 3. Accessibility Testing
- Screen reader testing
- Keyboard navigation
- Focus management
- ARIA attributes
- Error announcements

## Examples

### 1. Basic Form
```typescript
export function BasicForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  
  const [errors, setErrors] = useState({});
  
  return (
    <form onSubmit={handleSubmit}>
      <Box mb="4">
        <Label htmlFor="name">Name</Label>
        <TextField.Root>
          <TextField.Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </TextField.Root>
        {errors.name && (
          <ErrorMessage>{errors.name}</ErrorMessage>
        )}
      </Box>
      
      {/* Similar fields for email and message */}
      
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

### 2. Complex Form
```typescript
export function ComplexForm() {
  return (
    <form>
      <Box mb="4">
        <Label>Organization Type</Label>
        <Select.Root>
          <Select.Trigger />
          <Select.Content>
            <Select.Item value="nonprofit">Nonprofit</Select.Item>
            <Select.Item value="government">Government</Select.Item>
            <Select.Item value="private">Private</Select.Item>
          </Select.Content>
        </Select.Root>
      </Box>
      
      <Box mb="4">
        <Label>Notifications</Label>
        <Checkbox.Root>
          <Checkbox.Indicator />
          <Label>Email notifications</Label>
        </Checkbox.Root>
      </Box>
      
      <Box mb="4">
        <Label>Status</Label>
        <Switch.Root>
          <Switch.Thumb />
        </Switch.Root>
      </Box>
    </form>
  );
} 