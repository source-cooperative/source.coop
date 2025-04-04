// src/types/auth.ts
import { AxiosError } from 'axios';

export interface FlowNodeAttributes {
  name: string;
  type: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface FlowMessage {
  id: number;
  text: string;
  type: string;
  context?: Record<string, unknown>;
}

// Define FlowNode to match Ory's UiNode structure
export interface FlowNode {
  type: string;
  group?: string;
  attributes: FlowNodeAttributes;
  messages?: FlowMessage[];
  meta?: {
    label?: {
      id: number;
      text: string;
      type: string;
    };
  };
}

export interface FlowUI {
  nodes: FlowNode[];
  messages?: FlowMessage[];
  method?: string;
  action?: string;
}

// AuthFlow matches Ory's Login/Registration flow structure
export interface AuthFlow {
  id: string;
  type: string;
  ui: FlowUI;
  issued_at: string;
  expires_at: string;
  return_to?: string;
  created_at?: string;
  updated_at?: string;
  refresh?: boolean;
  state?: string;
  oauth2_login_challenge?: string;
  oauth2_login_request?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ApiError {
  response?: {
    data?: {
      ui?: FlowUI;
      error?: {
        code?: number;
        message?: string;
        reason?: string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    status?: number;
    statusText?: string;
  };
  message?: string;
  code?: string;
  [key: string]: unknown;
}

/**
 * Type guard to check if an error is an API error with response data
 */
export function isApiError<T>(error: unknown): error is AxiosError<T> {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

// For compatibility with Ory UiNode
export type OryCompatibleFlowNode = FlowNode; 