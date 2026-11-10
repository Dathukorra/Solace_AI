/**
 * Crisis and Self-Harm Detection Service
 *
 * Implements safety guidelines: detects indicators of self-harm, suicide,
 * or immediate danger and provides a grounded, supportive crisis response.
 */

const CRISIS_KEYWORDS = [
  'want to die',
  'want to kill myself',
  'kill myself',
  'suicide',
  'suicidal',
  'end my life',
  'ending my life',
  'hang myself',
  'overdose',
  'hurt myself',
  'cut myself',
  'self harm',
  'self-harm',
  'better off dead',
  'no reason to live',
  "don't want to wake up",
  'dont want to wake up',
  'wish i was dead',
  'wish i were dead',
  "can't go on living",
  'cant go on living',
];

export const CRISIS_RESPONSE_TEXT =
  "I hear how much pain you're carrying right now, and I want you to know you don't have to face this alone. " +
  'Please reach out for support right this minute—your life matters, and there is help ready for you. ' +
  'If you are in India, please call or text Tele-MANAS at 14416 or 1800-891-4416 (available 24/7, free). ' +
  'If you are elsewhere, please contact your local emergency services or a trusted person close to you right away.';

/**
 * Checks whether user input matches explicit or strong crisis patterns
 */
export function detectCrisis(text: string): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase().trim();

  return CRISIS_KEYWORDS.some((kw) => normalized.includes(kw));
}
