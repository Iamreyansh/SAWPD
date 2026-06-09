/**
 * Password strength validation.
 * Enforces: min 8 chars, 1 uppercase, 2 digits, 1 symbol.
 */

export type PasswordStrength = "weak" | "fair" | "strong";

export function checkPasswordStrength(password: string): {
  strength: PasswordStrength;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("At least 8 characters");
  }
  if (password.length > 128) {
    errors.push("Under 128 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("At least one uppercase letter");
  }

  // At least 2 digits
  const digitCount = (password.match(/[0-9]/g) || []).length;
  if (digitCount < 2) {
    errors.push("At least two digits");
  }

  // At least 1 symbol (!@#$%^&*()_+-=[]{}|;':\",./<>? etc.)
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("At least one symbol");
  }

  let strength: PasswordStrength = "strong";
  if (errors.length > 2) strength = "weak";
  else if (errors.length > 0) strength = "fair";

  return { strength, errors };
}
