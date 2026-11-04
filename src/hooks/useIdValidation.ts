import { useState, useEffect } from "react";
import { useDebounce } from "./useDebounce";

// Helper function to validate URL slug format
function isValidUrlSlug(slug: string): boolean {
  // URL slug should:
  // - Only contain lowercase letters, numbers, and hyphens
  // - Not start or end with a hyphen
  // - Not contain consecutive hyphens
  // - Not be empty
  if (!slug || slug.length === 0) return false;

  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

interface ValidationState {
  isValid: boolean | null; // null = not checked yet, true = valid, false = invalid
  isLoading: boolean;
  error: string | null;
}

interface UseIdValidationOptions {
  accountId: string; // Always required
  productId?: string; // Optional - presence determines validation type
  minLength?: number;
  debounceMs?: number;
}

function useIdValidation(id: string, options: UseIdValidationOptions) {
  const { accountId, productId, minLength = 3, debounceMs = 500 } = options;

  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: null,
    isLoading: false,
    error: null,
  });

  // Debounce the ID input to avoid too many API calls
  const debouncedId = useDebounce(id, debounceMs);

  // Also debounce the accountId to prevent immediate API calls when account changes
  const debouncedAccountId = useDebounce(accountId, debounceMs);

  useEffect(() => {
    // Don't validate empty strings or very short strings
    if (!debouncedId || debouncedId.length < minLength) {
      setValidationState({
        isValid: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    // Validate URL slug format
    if (!isValidUrlSlug(debouncedId)) {
      setValidationState({
        isValid: false,
        isLoading: false,
        error:
          "ID must be a valid URL slug (lowercase letters, numbers, and hyphens only)",
      });
      return;
    }

    // Also validate accountId if it's being used for product validation
    const isProductValidation =
      productId !== undefined && productId !== null && productId !== "";

    if (isProductValidation && !isValidUrlSlug(debouncedAccountId)) {
      setValidationState({
        isValid: false,
        isLoading: false,
        error:
          "Account ID must be a valid URL slug (lowercase letters, numbers, and hyphens only)",
      });
      return;
    }

    // Clear validation state if user is still typing (id doesn't match debounced value)
    if (id !== debouncedId || accountId !== debouncedAccountId) {
      setValidationState((prev) => ({
        ...prev,
        isValid: null,
        error: null,
      }));
      return;
    }

    const validateId = async () => {
      setValidationState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(
          isProductValidation
            ? `/api/v1/products/${debouncedAccountId}/${debouncedId}`
            : `/api/v1/accounts/${debouncedId}`,
          {
            method: "HEAD",
          }
        );

        // Only a 404 frees the ID. A 401 or 403 is a product that exists but
        // that the caller may not read, so its ID is taken too.
        const taken = response.ok || [401, 403].includes(response.status);
        if (!taken && response.status !== 404) {
          throw new Error(`Unexpected status ${response.status}`);
        }
        setValidationState({
          isValid: !taken,
          isLoading: false,
          error: taken
            ? `${
                isProductValidation ? "Product" : "Account"
              } ID is not available`
            : null,
        });
      } catch (error) {
        setValidationState({
          isValid: false,
          isLoading: false,
          error: `Failed to check ${
            isProductValidation ? "product" : "account"
          } ID availability`,
        });
      }
    };

    validateId();
  }, [debouncedId, debouncedAccountId, productId, minLength]);

  return validationState;
}

// Convenience hooks for backward compatibility and ease of use
export function useAccountIdValidation(accountId: string) {
  return useIdValidation(accountId, { accountId });
}

export function useProductIdValidation(productId: string, accountId: string) {
  return useIdValidation(productId, { accountId, productId });
}
