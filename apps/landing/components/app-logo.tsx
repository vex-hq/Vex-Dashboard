import Link from 'next/link';

import { cn } from '@kit/ui/utils';

import { KlioMark } from './klio-mark';

export function AppLogo({
  href,
  className,
}: {
  href?: string;
  className?: string;
}) {
  const logo = (
    <div className={cn('text-foreground flex items-center gap-2', className)}>
      <KlioMark size={22} />
      <span className="text-foreground text-lg font-semibold tracking-tight">
        Klio
      </span>
    </div>
  );

  if (!href) {
    return logo;
  }

  return (
    <Link aria-label="Home Page" href={href}>
      {logo}
    </Link>
  );
}
