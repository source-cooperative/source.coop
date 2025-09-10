import { useState, useEffect } from "react";
import { useDebounce } from "./useDebounce";

interface ValidationState {
  isValid: boolean | null; // null = not checked yet, true = valid, false = invalid
  isLoading: boolean;
  error: string | null;
}

export function useAccountIdValidation(accountId: string) {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: null,
    isLoading: false,
    error: null,
  });

  // Debounce the account ID input to avoid too many API calls
  const debouncedAccountId = useDebounce(accountId, 500);

  // Clear validation state immediately when user starts typing
  useEffect(() => {
    if (accountId !== debouncedAccountId) {
      setValidationState({
        isValid: null,
        isLoading: false,
        error: null,
      });
    }
  }, [accountId, debouncedAccountId]);

  useEffect(() => {
    // Don't validate empty strings or very short strings
    if (!debouncedAccountId || debouncedAccountId.length < 3) {
      setValidationState({
        isValid: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    const validateAccountId = async () => {
      setValidationState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(`/api/accounts/check-id`, {
          method: "PUT",
          body: JSON.stringify({ id: debouncedAccountId }),
        });

        const data = await response.json();

        if (response.ok) {
          setValidationState({
            isValid: data.available,
            isLoading: false,
            error: data.available
              ? null
              : data.error || "Account ID is not available",
          });
        } else {
          setValidationState({
            isValid: false,
            isLoading: false,
            error: data.error || "Error checking account ID availability",
          });
        }
      } catch (error) {
        setValidationState({
          isValid: false,
          isLoading: false,
          error: "Failed to check account ID availability",
        });
      }
    };

    validateAccountId();
  }, [debouncedAccountId]);

  return validationState;
}
