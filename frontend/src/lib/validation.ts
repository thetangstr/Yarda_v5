/**
 * Input Validation Utilities
 *
 * Implements PRD UX-R6: Error Prevention
 * - Real-time input validation
 * - User-friendly validation messages
 * - Debounced validation for performance
 */

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string; // User-friendly error message
}

/**
 * Validates email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }

  return { isValid: true };
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }

  return { isValid: true };
}

/**
 * Validates address format
 */
export function validateAddress(address: string): ValidationResult {
  if (!address || address.trim().length === 0) {
    return { isValid: false, message: 'Address is required' };
  }

  if (address.trim().length < 5) {
    return { isValid: false, message: 'Please enter a complete address' };
  }

  // Basic address format validation (number + street name)
  const hasNumber = /\d/.test(address);
  if (!hasNumber) {
    return { isValid: false, message: 'Address must include a street number' };
  }

  return { isValid: true };
}

/**
 * Validates custom prompt length
 */
export function validatePrompt(prompt: string, maxLength = 500): ValidationResult {
  if (!prompt || prompt.trim().length === 0) {
    return { isValid: true }; // Prompt is optional
  }

  if (prompt.length > maxLength) {
    return {
      isValid: false,
      message: `Prompt must be less than ${maxLength} characters (currently ${prompt.length})`,
    };
  }

  return { isValid: true };
}

/**
 * Validates area selection
 */
export function validateAreaSelection(areas: string[]): ValidationResult {
  if (!areas || areas.length === 0) {
    return { isValid: false, message: 'Please select at least one yard area' };
  }

  if (areas.length > 5) {
    return { isValid: false, message: 'You can select up to 5 yard areas per generation' };
  }

  return { isValid: true };
}

/**
 * Validates style selection
 */
export function validateStyleSelection(style: string): ValidationResult {
  if (!style) {
    return { isValid: false, message: 'Please select a design style' };
  }

  return { isValid: true };
}

/**
 * Debounce function for validation
 * Prevents excessive validation calls during typing
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Validates entire generation form
 */
export interface GenerationFormData {
  address: string;
  areas: string[];
  style: string;
  customPrompt?: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: {
    address?: string;
    areas?: string;
    style?: string;
    customPrompt?: string;
  };
}

export function validateGenerationForm(formData: GenerationFormData): FormValidationResult {
  const errors: FormValidationResult['errors'] = {};

  // Validate address
  const addressResult = validateAddress(formData.address);
  if (!addressResult.isValid) {
    errors.address = addressResult.message;
  }

  // Validate areas
  const areasResult = validateAreaSelection(formData.areas);
  if (!areasResult.isValid) {
    errors.areas = areasResult.message;
  }

  // Validate style
  const styleResult = validateStyleSelection(formData.style);
  if (!styleResult.isValid) {
    errors.style = styleResult.message;
  }

  // Validate custom prompt (optional)
  if (formData.customPrompt) {
    const promptResult = validatePrompt(formData.customPrompt);
    if (!promptResult.isValid) {
      errors.customPrompt = promptResult.message;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
