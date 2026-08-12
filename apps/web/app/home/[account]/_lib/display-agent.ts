/**
 * Agent ids in the wild are machine paths (`klio-abhisheks-macbook-pro-local/claude-code`)
 * or product prefixes (`klio-curator`). The Hub shows the short tail a human
 * would say out loud.
 */
export function displayAgent(agentId: string): string {
  const tail = agentId.includes('/')
    ? agentId.slice(agentId.lastIndexOf('/') + 1)
    : agentId;

  if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(tail)) {
    return `${tail.slice(0, 8)}…`;
  }

  return tail.replace(/^klio-/, '');
}
