import { buildSolaSystemPrompt, parseSolaResponse, SolaPromptContext } from '../lib/solaPrompt';

describe('Sola AI Persona & Prompt Utility', () => {
  it('interpolates user context variables properly', () => {
    const context: SolaPromptContext = {
      name: 'Aanya',
      goals: ['anxiety reduction', 'mindful sleep'],
      recentMoods: [{ score: 2, emotions: ['overwhelmed', 'tired'], date: '2026-11-04' }],
      todayMood: { score: 3, emotions: ['calm'], note: 'A bit quiet today' },
      memories: ['preparing for law board exams'],
      conversationSummaries: ['Talked about study fatigue on Tuesday'],
    };

    const prompt = buildSolaSystemPrompt(context);

    expect(prompt).toContain('User name: Aanya.');
    expect(prompt).toContain('anxiety reduction, mindful sleep');
    expect(prompt).toContain('2/5 (overwhelmed, tired) on 2026-11-04');
    expect(prompt).toContain('3/5 (calm) - "A bit quiet today"');
    expect(prompt).toContain('preparing for law board exams');
    expect(prompt).toContain('Talked about study fatigue on Tuesday');
    expect(prompt).toContain('Tele-MANAS 14416');
  });

  it('parses [[ACTIVITY:...]] tags into structured payload and clean content', () => {
    const rawAiReply =
      'It sounds like your mind has been spinning with all those deadlines today. Would you like to take three minutes to reset your breathing together?\n\n[[ACTIVITY:{"type":"breathing","title":"Box Breathing 4-4-4","reason":"To help lower acute nervous system arousal"}]]';

    const parsed = parseSolaResponse(rawAiReply);

    expect(parsed.suggestedActivity).toEqual({
      type: 'breathing',
      title: 'Box Breathing 4-4-4',
      reason: 'To help lower acute nervous system arousal',
    });
    expect(parsed.cleanContent).toBe(
      'It sounds like your mind has been spinning with all those deadlines today. Would you like to take three minutes to reset your breathing together?'
    );
  });

  it('parses [[MEMORY:...]] tags and extracts facts', () => {
    const rawAiReply =
      'Taking care of your sister Maya sounds like a big part of your daily routine right now. How is she doing today?\n[[MEMORY:"has a sister named Maya who she cares for"]]';

    const parsed = parseSolaResponse(rawAiReply);

    expect(parsed.newMemories).toEqual(['has a sister named Maya who she cares for']);
    expect(parsed.cleanContent).toBe(
      'Taking care of your sister Maya sounds like a big part of your daily routine right now. How is she doing today?'
    );
  });

  it('strips leaked double-brace notes and unknown markers from clean content', () => {
    const rawAiReply =
      'That sounds heavy. Would a short breathing pause help?\n[[ACTIVITY:{"type":"breathing","title":"Box Breathing","reason":"To settle your nerves"}]]\n{{internal note: should I suggest an activity? yes}}\n[[UNKNOWN:{"foo":"bar"}]]';

    const parsed = parseSolaResponse(rawAiReply);

    expect(parsed.cleanContent).toBe('That sounds heavy. Would a short breathing pause help?');
    expect(parsed.suggestedActivity).toEqual({
      type: 'breathing',
      title: 'Box Breathing',
      reason: 'To settle your nerves',
    });
    expect(parsed.newMemories).toEqual([]);
  });

  it('strips an unclosed double-brace note left by the model', () => {
    const parsed = parseSolaResponse('You are doing enough today. {{planning that never closes');

    expect(parsed.cleanContent).toBe('You are doing enough today.');
  });
});
