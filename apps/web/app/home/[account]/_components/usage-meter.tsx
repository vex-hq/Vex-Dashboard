'use client';

interface UsageMeterProps {
  label: string;
  current: number;
  limit: number;
  unit?: string;
}

export function UsageMeter({
  label,
  current,
  limit,
  unit = '',
}: UsageMeterProps) {
  const isUnlimited = limit < 0;
  const percentage = isUnlimited
    ? 0
    : limit > 0
      ? Math.min((current / limit) * 100, 100)
      : 0;
  const isWarning = !isUnlimited && percentage >= 80;
  const isExceeded = !isUnlimited && percentage >= 100;

  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-sm">
          {current.toLocaleString()} /{' '}
          {isUnlimited ? '∞' : limit.toLocaleString()} {unit}
        </span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all ${
            isExceeded
              ? 'bg-destructive'
              : isWarning
                ? 'bg-yellow-500'
                : 'bg-primary'
          }`}
          style={{ width: isUnlimited ? '0%' : `${percentage}%` }}
        />
      </div>
      {isExceeded && (
        <p className="text-destructive mt-2 text-xs">
          Quota exceeded. Upgrade your plan for uninterrupted service.
        </p>
      )}
      {isWarning && !isExceeded && (
        <p className="mt-2 text-xs text-yellow-500">
          Approaching limit ({Math.round(percentage)}% used).
        </p>
      )}
    </div>
  );
}
