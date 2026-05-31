import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Vex',
  description:
    'Privacy policy for Vex, the runtime reliability layer for AI agents.',
};

export default function PrivacyPage() {
  return (
    <div className="container py-24">
      <h1 className="mb-8 text-3xl font-bold text-foreground">Privacy Policy</h1>
      <div className="prose prose-invert prose-headings:text-foreground prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-p:leading-relaxed prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground max-w-[720px] text-muted-foreground">
        <p className="text-sm text-muted-foreground">
          Last updated: February 19, 2026
        </p>

        <h2>1. Introduction</h2>
        <p>
          Vex (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the
          tryvex.dev website and the Vex SDK and API services (collectively, the
          &quot;Service&quot;). This Privacy Policy explains how we collect,
          use, disclose, and safeguard your information when you use our
          Service.
        </p>

        <h2>2. Information We Collect</h2>
        <p>
          <strong>Account Information:</strong> When you create an account, we
          collect your name, email address, and authentication credentials.
        </p>
        <p>
          <strong>Usage Data:</strong> We collect information about how you
          interact with our Service, including API call metadata, SDK
          configuration, and feature usage patterns.
        </p>
        <p>
          <strong>Agent Telemetry:</strong> When you use the Vex SDK, we collect
          metadata about agent execution (e.g., latency, correction counts,
          drift scores). We do not collect the content of your agent&apos;s
          inputs or outputs unless you explicitly enable content logging.
        </p>
        <p>
          <strong>Technical Data:</strong> We collect IP addresses, browser
          type, operating system, and device information for security and
          analytics purposes.
        </p>

        <h2>3. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide, maintain, and improve the Service</li>
          <li>Monitor and analyze usage patterns and trends</li>
          <li>Detect, prevent, and address technical issues</li>
          <li>Send you service-related communications</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>4. Data Retention</h2>
        <p>
          We retain your account information for as long as your account is
          active. Agent telemetry data is retained for 90 days by default. You
          can request deletion of your data at any time by contacting us at
          info@tryvex.dev.
        </p>

        <h2>5. Data Sharing</h2>
        <p>
          We do not sell your personal information. We may share data with
          service providers who assist in operating our Service (e.g., hosting,
          analytics), subject to confidentiality agreements. We may disclose
          information if required by law.
        </p>

        <h2>6. Security</h2>
        <p>
          We implement industry-standard security measures including encryption
          in transit (TLS 1.3) and at rest (AES-256). API keys are hashed and
          never stored in plaintext.
        </p>

        <h2>7. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Export your data in a portable format</li>
          <li>Withdraw consent at any time</li>
        </ul>

        <h2>8. Cookies</h2>
        <p>
          We use essential cookies for authentication and session management. We
          use analytics cookies only with your consent. You can manage cookie
          preferences in your browser settings.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of material changes by posting the new policy on this page and
          updating the &quot;Last updated&quot; date.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, contact us at{' '}
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
