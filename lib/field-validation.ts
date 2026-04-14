/**
 * Pure, reusable field validators for client + server forms.
 *
 * Every validator returns either null (valid) or a user-friendly
 * error string. Pure + zero deps so the same function runs at
 * keystroke time in the browser and at submit time on the server.
 *
 * Also exports `useDebouncedValidator`, a React hook for wiring
 * live validation to a controlled input without firing on every
 * keystroke.
 */

import { useEffect, useState } from "react";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";

export type Validator = (value: string) => string | null;

// ─── Core validators ──────────────────────────────────────────────

export const validateRequired: Validator = (value) =>
  value && value.trim().length > 0 ? null : "This field is required";

export const validateEmail: Validator = (value) => {
  if (!value) return "Email is required";
  if (!isValidEmail(value)) return "That doesn't look like a valid email";
  if (isDisposableEmail(value)) return "Please use a real email address";
  return null;
};

export const validateAustralianPhone: Validator = (value) => {
  if (!value) return "Phone is required";
  // Strip spaces, parens, hyphens
  const cleaned = value.replace(/[\s().-]/g, "");
  // +61[2-9]XXXXXXXX, 0[2-9]XXXXXXXX, 61[2-9]XXXXXXXX, 4/04/614xxxxxxxx mobile
  if (!/^(\+?61|0)[2-9]\d{8}$/.test(cleaned)) {
    return "Use an Australian format, e.g. 0412 345 678 or +61 412 345 678";
  }
  return null;
};

export const validateAustralianPostcode: Validator = (value) => {
  if (!value) return "Postcode is required";
  if (!/^\d{4}$/.test(value.trim())) return "Postcode must be 4 digits";
  return null;
};

export const validatePasswordStrength: Validator = (value) => {
  if (!value) return "Password is required";
  if (value.length < 10) return "Password must be at least 10 characters";
  if (!/[A-Z]/.test(value)) return "Add at least one uppercase letter";
  if (!/[a-z]/.test(value)) return "Add at least one lowercase letter";
  if (!/\d/.test(value)) return "Add at least one number";
  return null;
};

export const validateAfslNumber: Validator = (value) => {
  if (!value) return "AFSL number is required";
  const cleaned = value.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return "AFSL is 6 digits";
  return null;
};

export const validateAbn: Validator = (value) => {
  if (!value) return "ABN is required";
  const cleaned = value.replace(/\s/g, "");
  if (!/^\d{11}$/.test(cleaned)) return "ABN is 11 digits";
  // Standard ABN checksum
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = cleaned.split("").map(Number);
  digits[0] -= 1;
  const sum = digits.reduce((s, d, i) => s + d * weights[i], 0);
  if (sum % 89 !== 0) return "ABN checksum failed — double-check the number";
  return null;
};

/** Length-bounded validator factory — e.g. a 1-200 char title */
export function validateLength(opts: { min?: number; max?: number; label?: string }): Validator {
  const label = opts.label || "Field";
  return (value) => {
    if (opts.min != null && (value || "").trim().length < opts.min) {
      return `${label} must be at least ${opts.min} characters`;
    }
    if (opts.max != null && (value || "").length > opts.max) {
      return `${label} must be at most ${opts.max} characters`;
    }
    return null;
  };
}

/**
 * Compose multiple validators — first error wins, null if all pass.
 */
export function compose(...validators: Validator[]): Validator {
  return (value) => {
    for (const v of validators) {
      const err = v(value);
      if (err) return err;
    }
    return null;
  };
}

// ─── React hook ───────────────────────────────────────────────────

/**
 * Debounced live-validation hook.
 *
 *     const { error, touched, onBlur } = useDebouncedValidator(
 *       email,
 *       validateEmail,
 *       250,
 *     );
 *
 * - Does NOT fire on the first render (so pristine forms stay quiet)
 * - Fires after `delay` ms of inactivity on the input
 * - Fires immediately on blur
 * - Exposes `touched` so you can hide the error until the user has
 *   interacted at least once
 */
export function useDebouncedValidator(
  value: string,
  validator: Validator,
  delay = 250,
): { error: string | null; touched: boolean; onBlur: () => void } {
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!touched) return;
    const handle = setTimeout(() => {
      setError(validator(value));
    }, delay);
    return () => clearTimeout(handle);
  }, [value, touched, delay, validator]);

  return {
    error,
    touched,
    onBlur: () => {
      setTouched(true);
      setError(validator(value));
    },
  };
}
