/**
 * Curator rows arrive as "The user wants the install flow to be zero-config."
 * The Hub prints the payload, not the wrapper.
 */
const LEAD_INS = [
  /^The user wants (?:the )?/i,
  /^The user requested /i,
  /^The user asked (?:to |for )?/i,
];

export function displayMemory(content: string): string {
  const trimmed = content.trim();
  let text = trimmed;
  let stripped = false;

  for (const leadIn of LEAD_INS) {
    if (leadIn.test(text)) {
      text = text.replace(leadIn, '');
      stripped = true;
      break;
    }
  }

  text = text.trim();
  if (!text) return trimmed;
  if (!stripped) return text;

  return text.charAt(0).toUpperCase() + text.slice(1);
}
