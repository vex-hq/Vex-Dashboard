/**
 * Single source of truth for the onboarding wizard's step count.
 *
 * The wizard (`app/onboarding/_components/onboarding-wizard.tsx`) renders steps
 * `0 .. TOTAL_ONBOARDING_STEPS - 1`:
 *   0 Welcome · 1 InviteTeam · 2 ApiKey · 3 ConnectAgents · 4 InstallSdk ·
 *   5 VerifyConnection
 *
 * Server-side step handling derives from these constants so the wizard and the
 * server can never drift:
 *   - `UpdateStepSchema` (server-actions) bounds the persisted step at
 *     `FINAL_ONBOARDING_STEP` — `goNext` persists every non-terminal transition,
 *     so the highest value ever sent is the final step index.
 *   - `completeOnboarding` (onboarding.loader) records `FINAL_ONBOARDING_STEP`.
 *
 * This module is intentionally directive-free (no `'use client'` / `'use server'`
 * / `'server-only'`) so it is safe to import from the client wizard, the
 * `'use server'` actions, and the `'server-only'` loader alike.
 */
export const TOTAL_ONBOARDING_STEPS = 6;

/** Index of the terminal onboarding step (VerifyConnection). */
export const FINAL_ONBOARDING_STEP = TOTAL_ONBOARDING_STEPS - 1;
