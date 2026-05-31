// Ensure billing config can parse at module load time during tests. The
// production value comes from the environment; tests default to 'stripe'
// (the app's configured provider) so importing billing.config never throws.
process.env.NEXT_PUBLIC_BILLING_PROVIDER ??= 'stripe';
