import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@kit/ui/utils';

export function AppLogo({
  href,
  className,
}: {
  href?: string;
  className?: string;
}) {
  const logo = (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center justify-center rounded-lg bg-white p-1.5">
        <Image
          src="/images/vex-icon-black-transparent.svg"
          alt="Vex"
          width={24}
          height={24}
        />
      </div>
      <span className="text-lg font-semibold tracking-tight text-white">
        Vex
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
