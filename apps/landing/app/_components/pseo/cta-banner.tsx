import Link from 'next/link';

export function CtaBanner({
  heading = 'Start verifying your agents in minutes',
  description = 'Add Vex to your agent pipeline with two lines of code.',
}: {
  heading?: string;
  description?: string;
}) {
  return (
    <div className="mt-16 rounded-xl border border-border/20 bg-foreground/5 p-8 text-center">
      <h2 className="mb-2 text-xl font-bold text-foreground">{heading}</h2>
      <p className="mb-6 text-muted-foreground">{description}</p>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <code className="rounded-lg border border-border bg-background px-4 py-2 font-mono text-sm text-foreground">
          pip install vex-sdk
        </code>
        <Link
          href="https://app.tryvex.dev"
          className="rounded-lg bg-foreground px-6 py-2 text-sm font-medium text-background transition-colors hover:bg-[var(--klio-foreground-strong)]"
        >
          Get API Key
        </Link>
      </div>
    </div>
  );
}
