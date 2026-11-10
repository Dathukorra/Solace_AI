import { CURATED_AFFIRMATIONS, getDeterministicAffirmation } from '../lib/affirmations';

describe('Curated Affirmations & Deterministic Selector', () => {
  it('contains exactly 60 curated affirmations without duplicates', () => {
    expect(CURATED_AFFIRMATIONS.length).toBe(60);
    const unique = new Set(CURATED_AFFIRMATIONS);
    expect(unique.size).toBe(60);
  });

  it('picks an affirmation deterministically by date string', () => {
    const pick1 = getDeterministicAffirmation('2026-11-05');
    const pick2 = getDeterministicAffirmation('2026-11-05');
    const pick3 = getDeterministicAffirmation('2026-11-06');

    expect(pick1.text).toBe(pick2.text);
    expect(pick1.index).toBe(pick2.index);
    expect(typeof pick1.text).toBe('string');
    expect(typeof pick3.text).toBe('string');
    expect(pick1.text.length).toBeGreaterThan(10);
  });
});
