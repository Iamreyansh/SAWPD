/**
 * Password strength validation.
 * Enforces minimum security requirements beyond just length.
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
  if (!/[a-z]/.test(password)) {
    errors.push("At least one lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("At least one uppercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("At least one number");
  }

  // Common weak passwords
  const common = [
    "password", "12345678", "qwerty123", "letmein", "admin",
    "welcome1", "monkey123", "abc12345", "password1",
  ];
  if (common.includes(password.toLowerCase())) {
    errors.push("Password is too common");
  }

  // Sequential/repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push("Avoid repeated characters (e.g. aaa)");
  }
  if (/012|123|234|345|456|567|678|789|890/.test(password)) {
    errors.push("Avoid sequential numbers (e.g. 123)");
  }

  let strength: PasswordStrength = "strong";
  if (errors.length > 2) strength = "weak";
  else if (errors.length > 0) strength = "fair";

  return { strength, errors };
}
