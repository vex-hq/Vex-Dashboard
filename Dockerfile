# ---------------------------------------------------------------------------
# Dashboard – Multi-stage Docker build (Next.js standalone in Turborepo)
# Build context: the repository root (this repo IS the dashboard).
#   docker build -f Dockerfile .        (run from the repo root)
# Railway builds from the connected repo root, so all COPY paths are
# relative to the repo root — do NOT prefix them with the folder name.
# ---------------------------------------------------------------------------

# ---- Stage 0: base --------------------------------------------------------
FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
RUN apk add --no-cache libc6-compat

WORKDIR /app

# ---- Stage 1: deps --------------------------------------------------------
FROM base AS deps

WORKDIR /app

# Copy workspace configuration first
COPY pnpm-lock.yaml ./pnpm-lock.yaml
COPY pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY package.json ./package.json

# Copy all workspace package.json files to satisfy pnpm install
# -- apps
COPY apps/web/package.json ./apps/web/package.json
COPY apps/dev-tool/package.json ./apps/dev-tool/package.json
COPY apps/e2e/package.json ./apps/e2e/package.json
COPY apps/landing/package.json ./apps/landing/package.json

# -- packages (top-level)
COPY packages/analytics/package.json ./packages/analytics/package.json
COPY packages/database-webhooks/package.json ./packages/database-webhooks/package.json
COPY packages/email-templates/package.json ./packages/email-templates/package.json
COPY packages/i18n/package.json ./packages/i18n/package.json
COPY packages/mcp-server/package.json ./packages/mcp-server/package.json
COPY packages/next/package.json ./packages/next/package.json
COPY packages/otp/package.json ./packages/otp/package.json
COPY packages/policies/package.json ./packages/policies/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/supabase/package.json ./packages/supabase/package.json
COPY packages/ui/package.json ./packages/ui/package.json

# -- packages (nested workspaces under packages/**)
COPY packages/billing/core/package.json ./packages/billing/core/package.json
COPY packages/billing/gateway/package.json ./packages/billing/gateway/package.json
COPY packages/billing/lemon-squeezy/package.json ./packages/billing/lemon-squeezy/package.json
COPY packages/billing/stripe/package.json ./packages/billing/stripe/package.json
COPY packages/cms/core/package.json ./packages/cms/core/package.json
COPY packages/cms/keystatic/package.json ./packages/cms/keystatic/package.json
COPY packages/cms/types/package.json ./packages/cms/types/package.json
COPY packages/cms/wordpress/package.json ./packages/cms/wordpress/package.json
COPY packages/features/accounts/package.json ./packages/features/accounts/package.json
COPY packages/features/admin/package.json ./packages/features/admin/package.json
COPY packages/features/auth/package.json ./packages/features/auth/package.json
COPY packages/features/notifications/package.json ./packages/features/notifications/package.json
COPY packages/features/team-accounts/package.json ./packages/features/team-accounts/package.json
COPY packages/mailers/core/package.json ./packages/mailers/core/package.json
COPY packages/mailers/nodemailer/package.json ./packages/mailers/nodemailer/package.json
COPY packages/mailers/resend/package.json ./packages/mailers/resend/package.json
COPY packages/mailers/shared/package.json ./packages/mailers/shared/package.json
COPY packages/monitoring/api/package.json ./packages/monitoring/api/package.json
COPY packages/monitoring/core/package.json ./packages/monitoring/core/package.json
COPY packages/monitoring/sentry/package.json ./packages/monitoring/sentry/package.json

# -- tooling
COPY tooling/eslint/package.json ./tooling/eslint/package.json
COPY tooling/prettier/package.json ./tooling/prettier/package.json
COPY tooling/scripts/package.json ./tooling/scripts/package.json
COPY tooling/typescript/package.json ./tooling/typescript/package.json

# Copy the scripts tooling source so the preinstall hook succeeds
COPY tooling/scripts/src ./tooling/scripts/src

RUN pnpm install --frozen-lockfile

# ---- Stage 2: builder -----------------------------------------------------
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/ ./
COPY . .

# Build-time environment variables (self-hosting defaults)
ENV NEXT_PUBLIC_SITE_URL=https://localhost:3000
# Skip HTTPS-only validation during build (overridden at runtime)
ENV NEXT_PUBLIC_CI=true
ENV NEXT_PUBLIC_PRODUCT_NAME=Klio
ENV NEXT_PUBLIC_SITE_TITLE="Klio — Memory & Reliability for AI Agents"
ENV NEXT_PUBLIC_SITE_DESCRIPTION="Klio is the memory and reliability layer for AI agents. Persistent cross-session memory plus runtime verification — so your agents remember what matters and you catch bad output before it ships."
ENV NEXT_PUBLIC_DEFAULT_THEME_MODE=light
ENV NEXT_PUBLIC_THEME_COLOR="#ffffff"
ENV NEXT_PUBLIC_THEME_COLOR_DARK="#0a0a0a"
ENV NEXT_PUBLIC_ENABLE_THEME_TOGGLE=true
ENV NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS=true
ENV NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_CREATION=true
ENV NEXT_PUBLIC_AUTH_PASSWORD=true
ENV NEXT_TELEMETRY_DISABLED=1

# Supabase placeholders – required at build time but overridden at runtime
ENV NEXT_PUBLIC_SUPABASE_URL=http://localhost:8443
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder

# Billing / Stripe – not required for self-hosting
ENV NEXT_PUBLIC_BILLING_PROVIDER=stripe
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=placeholder

# Email / Mailer – required at build time for server-side module evaluation
ENV EMAIL_SENDER=noreply@localhost
ENV MAILER_PROVIDER=nodemailer

# CMS
ENV CMS_CLIENT=keystatic
ENV NEXT_PUBLIC_KEYSTATIC_CONTENT_PATH=./content

# Server-only placeholders – only needed at build time, not baked into the image
ARG SUPABASE_SERVICE_ROLE_KEY=placeholder
ARG SUPABASE_DB_WEBHOOK_SECRET=placeholder-webhook-secret

RUN pnpm --filter web build

# ---- Stage 3: runner -------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone output (includes node_modules and server.js at root)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Copy static assets and public files into the web app directory
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
