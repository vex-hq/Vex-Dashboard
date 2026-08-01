'use client';

import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';

import type { MemoryProvenance } from '../_lib/server/memory-visibility.types';

/**
 * Renders `session_memories.provenance` so a deduction never reads as a quote.
 *
 * `INFERRED` rows were synthesised by the curator from other memories. They
 * are a model's conclusion, not something the user said, and the external
 * review that prompted this column was specifically worried about inferences
 * that are wrong being trusted as statements. So `INFERRED` is the loud case:
 * an icon, a warning-toned outline and a hover title that says what it means.
 *
 * `EXTRACTED` is the norm — stated outright — and renders nothing at all,
 * because badging 95% of rows with "normal" trains people to ignore badges and
 * would drown the one label that matters.
 *
 * `AMBIGUOUS` is surfaced for review rather than trusted, so it gets the same
 * visual weight as `INFERRED` in a distinct tone.
 */
export function ProvenanceBadge({
  provenance,
}: {
  provenance: MemoryProvenance;
}) {
  const { t } = useTranslation('agentguard');

  if (provenance === 'EXTRACTED') {
    return null;
  }

  if (provenance === 'AMBIGUOUS') {
    return (
      <Badge
        variant="destructive"
        className="w-fit gap-1 font-normal"
        title={t('memory.provenanceAmbiguousHint')}
      >
        {t('memory.provenanceAmbiguous')}
      </Badge>
    );
  }

  return (
    <Badge
      variant="warning"
      className="w-fit gap-1 font-normal"
      title={t('memory.provenanceInferredHint')}
    >
      <Sparkles className="h-3 w-3" aria-hidden />
      {t('memory.provenanceInferred')}
    </Badge>
  );
}

/**
 * Row styling that pairs with the badge: inferred content is muted and
 * italicised so the distinction survives a quick scan down the table, not just
 * a careful read of the badge column.
 */
export function provenanceContentClassName(
  provenance: MemoryProvenance,
): string {
  return provenance === 'EXTRACTED'
    ? ''
    : 'text-muted-foreground italic decoration-dotted';
}
