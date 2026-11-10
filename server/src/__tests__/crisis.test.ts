import { detectCrisis, CRISIS_RESPONSE_TEXT } from '../services/crisis.service';

describe('Crisis Service', () => {
  it('detects acute suicide and self-harm keywords', () => {
    expect(detectCrisis('I feel hopeless and I want to die')).toBe(true);
    expect(detectCrisis('I think I am going to kill myself tonight')).toBe(true);
    expect(detectCrisis('I have been thinking about suicide')).toBe(true);
    expect(detectCrisis('I just want to end my life')).toBe(true);
    expect(detectCrisis('I feel an urge to cut myself')).toBe(true);
    expect(detectCrisis('I feel like everyone would be better off dead')).toBe(true);
  });

  it('does not trigger on casual everyday phrases', () => {
    expect(detectCrisis('I am having a busy day at work')).toBe(false);
    expect(detectCrisis('I had a tough time sleeping last night')).toBe(false);
    expect(detectCrisis('I feel a bit sad today')).toBe(false);
    expect(detectCrisis('Can we do a breathing exercise?')).toBe(false);
  });

  it('provides grounded crisis response with 24/7 helpline numbers', () => {
    expect(CRISIS_RESPONSE_TEXT).toContain('Tele-MANAS');
    expect(CRISIS_RESPONSE_TEXT).toContain('14416');
    expect(CRISIS_RESPONSE_TEXT).toContain('1800-891-4416');
  });
});
