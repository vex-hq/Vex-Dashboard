import { headers } from 'next/headers';

import { detectViewMode } from '~/lib/view-mode';

import { HumanHome } from './_components/home/human-home';
import { MachineView } from './_components/machine-view';
import { ViewToggle } from './_components/view-toggle';

/**
 * Dual-mode home. The mode is resolved server-side (URL ?view= wins, then a
 * bot/agent User-Agent sniff, else human) so the response bytes are correct
 * before any JS runs. The ViewToggle then lets a human flip it.
 */
export const dynamic = 'force-dynamic';

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const userAgent = (await headers()).get('user-agent');
  const mode = detectViewMode(view, userAgent);

  return (
    <>
      {mode === 'machine' ? <MachineView /> : <HumanHome />}
      <ViewToggle initialMode={mode} />
    </>
  );
}
