import { cn } from '@kit/ui/utils';

/**
 * The Klio mark — three stacked horizontal bars with the middle bar
 * indented from the left. Geometry only, no letterforms. Renders with
 * `currentColor` so it inherits whatever ink the parent sets — one asset
 * for light and dark surfaces. Legible from 16px (favicon) to display size.
 *
 * Keep the geometry in sync with apps/web/public/images/klio-mark.svg.
 */
export function KlioMark({
  size = 28,
  title = 'Klio',
  className,
}: {
  size?: number;
  title?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      className={cn('block shrink-0', className)}
    >
      <title>{title}</title>
      <rect x="3" y="6" width="18" height="2" fill="currentColor" />
      <rect x="8" y="11" width="13" height="2" fill="currentColor" />
      <rect x="3" y="16" width="18" height="2" fill="currentColor" />
    </svg>
  );
}
