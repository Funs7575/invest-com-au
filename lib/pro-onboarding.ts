/**
 * Shared constants for the /pros/join provider onboarding flow.
 *
 * Kept tiny on purpose — the actual route logic lives in
 * `app/api/pros/join/route.ts` (public submit), the admin queue routes,
 * and the wizard component. This module exists so wizard copy, route
 * handlers and the admin approve route share the same numeric values.
 *
 * Why a separate module: the admin approve route in
 * `app/api/admin/professionals/[id]/approve/route.ts` needs the credit
 * grant number to keep the approve-side and wizard-copy-side in sync.
 * Importing from `app/api/pros/join/route.ts` would couple admin →
 * public route modules in the build graph; importing from here is
 * neutral and avoids that.
 */

/** Free starter credits granted on admin approval. */
export const STARTER_FREE_CREDITS = 10;

/** Conversion factor for the credit grant when stored as cents. */
export const STARTER_CREDIT_CENTS_PER_CREDIT = 100;
