import {
  getScreenForReminderType,
  getGentleCopy,
  GENTLE_COPY_VARIANTS,
} from '../services/reminderScheduler.service';

describe('Reminder Scheduler & Push Copy Service', () => {
  it('maps reminder types to correct mobile navigation screen routes', () => {
    expect(getScreenForReminderType('MOOD')).toBe('mood');
    expect(getScreenForReminderType('CHECK_IN')).toBe('mood');
    expect(getScreenForReminderType('AFFIRMATION')).toBe('affirmation');
    expect(getScreenForReminderType('BREATHING')).toBe('breathing');
    expect(getScreenForReminderType('BREATHWORK')).toBe('breathing');
    expect(getScreenForReminderType('SELFCARE')).toBe('selfcare');
    expect(getScreenForReminderType('MINDFULNESS')).toBe('selfcare');
    expect(getScreenForReminderType('WIND_DOWN')).toBe('selfcare');
    expect(getScreenForReminderType('CUSTOM')).toBe('chat');
  });

  it('provides gentle, non-guilt-based reminder copy variants', () => {
    const guiltWords = ['failed', 'lazy', 'missed out', 'must', 'hurry up', 'shame', 'bad'];

    for (const type in GENTLE_COPY_VARIANTS) {
      const variants = GENTLE_COPY_VARIANTS[type];
      expect(variants.length).toBeGreaterThanOrEqual(3);

      for (const text of variants) {
        for (const guiltWord of guiltWords) {
          expect(text.toLowerCase()).not.toContain(guiltWord);
        }
      }
    }
  });

  it('rotates copy variants deterministically by date string', () => {
    const copy1 = getGentleCopy('MOOD', '2026-11-05');
    const copy2 = getGentleCopy('MOOD', '2026-11-05');
    expect(copy1).toBe(copy2);
    expect(typeof copy1).toBe('string');
    expect(copy1.length).toBeGreaterThan(10);
  });
});
