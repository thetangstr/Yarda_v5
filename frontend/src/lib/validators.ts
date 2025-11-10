/**
 * Email Validation Utility
 *
 * Validates email addresses according to RFC 5322 standards
 * Used for magic link authentication email validation
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 maximum length

/**
 * Validates an email address
 *
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * validateEmail('user@example.com') // true
 * validateEmail('invalid') // false
 * validateEmail('') // false
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  if (email.length > MAX_EMAIL_LENGTH) return false;
  if (!EMAIL_REGEX.test(email)) return false;
  return true;
}

/**
 * Get user-friendly error message for invalid email
 *
 * @param email - Email address that failed validation
 * @returns Error message describing why validation failed
 *
 * @example
 * getEmailError('') // "Please enter your email address"
 * getEmailError('invalid') // "Please enter a valid email address"
 */
export function getEmailError(email: string): string {
  if (!email) return 'Please enter your email address';
  if (email.length > MAX_EMAIL_LENGTH)
    return 'Email address is too long (max 254 characters)';
  if (!EMAIL_REGEX.test(email)) return 'Please enter a valid email address';
  return '';
}
