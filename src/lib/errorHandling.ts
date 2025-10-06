import { PostgrestError } from '@supabase/supabase-js';

export interface ActionableError {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Convert a Supabase error into an actionable error message
 */
export function handleSupabaseError(error: PostgrestError | Error | null, context: string): ActionableError {
  if (!error) {
    return {
      title: 'Unknown Error',
      description: `An unexpected error occurred while ${context}. Please try again.`,
    };
  }

  // PostgrestError
  if ('code' in error) {
    const pgError = error as PostgrestError;
    
    switch (pgError.code) {
      case '23505': // Unique violation
        return {
          title: 'Duplicate Entry',
          description: 'This item already exists. Please use a different identifier.',
        };
      
      case '23503': // Foreign key violation
        return {
          title: 'Related Data Missing',
          description: 'Cannot complete this action because required related data is missing.',
        };
      
      case '23514': // Check constraint violation
        return {
          title: 'Invalid Data',
          description: pgError.message || 'The data you entered does not meet the requirements. Please check your input.',
        };
      
      case '42501': // Insufficient privileges
        return {
          title: 'Permission Denied',
          description: 'You do not have permission to perform this action. Please contact your administrator.',
        };
      
      case 'PGRST200': // Missing relationship
        return {
          title: 'Data Relationship Error',
          description: 'There was an issue with related data. Please refresh the page and try again.',
        };
      
      case 'PGRST301': // Row not found
        return {
          title: 'Not Found',
          description: 'The requested item could not be found. It may have been deleted.',
        };
      
      default:
        return {
          title: 'Database Error',
          description: pgError.message || `An error occurred while ${context}. Please try again.`,
        };
    }
  }

  // Generic Error
  return {
    title: 'Error',
    description: error.message || `An error occurred while ${context}. Please try again.`,
  };
}

/**
 * Validate form data and return error messages
 */
export function validateFormData(
  data: Record<string, any>,
  required: string[]
): Record<string, string> {
  const errors: Record<string, string> = {};

  required.forEach(field => {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      errors[field] = 'This field is required';
    }
  });

  return errors;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phone.length >= 7 && phoneRegex.test(phone);
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unexpected error occurred';
}
