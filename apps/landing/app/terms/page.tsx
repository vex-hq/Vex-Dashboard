import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Vex',
  description:
    'Terms of service for Vex, the runtime reliability layer for AI agents.',
};

export default function TermsPage() {
  return (
    <div className="container py-24">
      <h1 className="mb-8 text-3xl font-bold text-foreground">Terms of Service</h1>
      <div className="prose prose-invert prose-headings:text-foreground prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-p:leading-relaxed prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground max-w-[720px] text-muted-foreground">
        <p className="text-sm text-muted-foreground">
          Last updated: February 19, 2026
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using the Vex website (tryvex.dev), SDK, API, or any
          related services (collectively, the &quot;Service&quot;), you agree to
          be bound by these Terms of Service. If you do not agree, do not use
          the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Vex provides a runtime reliability layer for AI agents, including
          SDKs, APIs, and a dashboard for monitoring, correcting, and optimizing
          AI agent behavior in production environments.
        </p>

        <h2>3. Account Registration</h2>
        <p>
          You must provide accurate and complete information when creating an
          account. You are responsible for maintaining the security of your
          account credentials and API keys. You are responsible for all
          activities that occur under your account.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose</li>
          <li>
            Attempt to gain unauthorized access to the Service or its systems
          </li>
          <li>
            Interfere with or disrupt the integrity or performance of the
            Service
          </li>
          <li>
            Reverse engineer, decompile, or disassemble any part of the Service
            (except the open-source SDK components)
          </li>
          <li>Use the Service to build a competing product</li>
          <li>Exceed rate limits or abuse API access</li>
        </ul>

        <h2>5. Open Source Components</h2>
        <p>
          The Vex SDK is released under the Apache 2.0 license. Your use of the
          open-source SDK is governed by the Apache 2.0 license terms. These
          Terms of Service govern your use of the hosted Service (API,
          dashboard, and cloud features).
        </p>

        <h2>6. Intellectual Property</h2>
        <p>
          The Service and its original content (excluding open-source
          components) are the property of Vex and are protected by applicable
          intellectual property laws. Your data remains your property.
        </p>

        <h2>7. Service Availability</h2>
        <p>
          We strive to maintain high availability but do not guarantee
          uninterrupted access. We may modify, suspend, or discontinue any part
          of the Service with reasonable notice. Scheduled maintenance windows
          will be communicated in advance.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Vex shall not be liable for
          any indirect, incidental, special, consequential, or punitive damages,
          including loss of profits, data, or business opportunities, arising
          from your use of the Service.
        </p>

        <h2>9. Indemnification</h2>
        <p>
          You agree to indemnify and hold Vex harmless from any claims, damages,
          or expenses arising from your use of the Service or violation of these
          Terms.
        </p>

        <h2>10. Termination</h2>
        <p>
          We may terminate or suspend your access immediately, without prior
          notice, for conduct that we believe violates these Terms or is harmful
          to other users or the Service. Upon termination, your right to use the
          Service ceases immediately.
        </p>

        <h2>11. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. Material
          changes will be communicated via email or a notice on the Service.
          Continued use after changes constitutes acceptance.
        </p>

        <h2>12. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with
          applicable laws, without regard to conflict of law provisions.
        </p>

        <h2>13. Contact</h2>
        <p>
          For questions about these Terms, contact us at{' '}
          <a
            href="mailto:info@tryvex.dev"
            className="text-foreground hover:text-foreground"
          >
            info@tryvex.dev
          </a>
          .
        </p>
      </div>
    </div>
  );
}
