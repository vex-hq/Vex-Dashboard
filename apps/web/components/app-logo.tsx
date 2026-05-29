import Link from 'next/link';

import { cn } from '@kit/ui/utils';

import { KlioMark } from './klio-mark';

export function AppLogo({
  href,
  label,
  className,
}: {
  href?: string | null;
  className?: string;
  label?: string;
}) {
  const logo = (
    <div className={cn('flex items-center gap-2', className)}>
      <KlioMark size={28} />
      <span className="text-foreground text-lg font-semibold tracking-tight">
        Klio
      </span>
    </div>
  );

  if (href === null) {
    return logo;
  }

  return (
    <Link aria-label={label ?? 'Home Page'} href={href ?? '/'} prefetch={true}>
      {logo}
    </Link>
  );
}
