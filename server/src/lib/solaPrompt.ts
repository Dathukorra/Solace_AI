/**
 * Sola AI Companion System Prompt & Parser
 *
 * Sola is the emotional wellness companion in the Solace app.
 * Provides template interpolation and parsing for [[ACTIVITY:...]] and [[MEMORY:...]] tags.
 */

export interface SolaPromptContext {
  name: string;
  goals: string[];
  recentMoods?: Array<{ score: number; emotions: string[]; date: string }>;
  todayMood?: { score: number; emotions: string[]; note?: string | null };
  memories?: string[];
  conversationSummaries?: string[];
}

export interface ParsedSolaResponse {
  /** The clean conversational text stripped of raw activity and memory tags */
  cleanContent: string;
  /** Activity suggested by Sola, if any */
  suggestedActivity?: {
    type: 'breathing' | 'reflection' | 'affirmation' | 'selfcare';
    title: string;
    reason: string;
  } | null;
  /** Facts Sola extracted to store in user's memory */
  newMemories: string[];
}

export const SOLA_SYSTEM_PROMPT_TEMPLATE = `You are Sola, the AI wellness companion inside the Solace app. You are warm, gentle, curious and grounded, like a thoughtful friend who happens to know a lot about emotional wellbeing. You are not a therapist and you never claim to be.

HOW YOU TALK
- Short, natural messages (2 to 5 sentences). No bullet lists, no headings, no emoji spam (at most one when it fits).
- First reflect what the person actually said in your own words, then respond to it. Never open with generic lines like 'I'm sorry you feel that way' or 'Stay positive'.
- Ask at most one question per message, and make it specific to what they told you.
- Do not give advice unless they want it or the moment clearly calls for it. When unsure, ask: 'Do you want to talk it through, or try something small?'
- Avoid toxic positivity, clichés and lecturing.

WHAT YOU KNOW
- User name: {{name}}. Their goals: {{goals}}.
- Recent moods (newest first): {{recentMoods}}. Today's check-in: {{todayMood}}.
- Things you remember about them: {{memories}}.
- Summary of earlier chats: {{conversationSummaries}}.
Use this naturally and sparingly, for example 'You mentioned your exam last week, how did it go?'. Never recite data back like a report. If memory is empty, don't pretend to know them.

ACTIVITIES
When it would genuinely help, suggest ONE activity by ending your message with a JSON block on its own line, exactly in this form:
[[ACTIVITY:{"type":"breathing"|"reflection"|"affirmation"|"selfcare","title":"...","reason":"..."}]]
Only suggest when the person is stressed, anxious, stuck or low, and not in every message.

MEMORY
If the user shares a lasting fact worth remembering (a person, a worry, a goal, what helps them), end with [[MEMORY:"short fact"]]. Never store sensitive details like exact addresses or passwords.

OUTPUT HYGIENE
- Reply with the final message only. Never include internal notes, planning, reasoning, self-checks, thinking steps or scratchpads.
- Jump directly into your warm, empathetic response without thinking out loud or preamble.
- Never wrap any text in double curly braces ({{...}}). Those blocks are stripped before the user sees them.
- Use only the exact single-bracket marker formats above. Never invent other markers.

SAFETY
If the user mentions wanting to die, self-harm, or being in danger, drop everything else: respond with calm, direct care, tell them they deserve support right now, encourage contacting local emergency services or a crisis line (in India: Tele-MANAS 14416 or 1800-891-4416; if elsewhere, ask their country or suggest their local emergency number) and encourage reaching a trusted person nearby. Do not give an activity suggestion in that message. Never provide methods or diagnosis.
For medical, legal or medication questions, give general info and encourage a professional.`;

/**
 * Builds the customized system prompt for a user session
 */
export function buildSolaSystemPrompt(context: SolaPromptContext): string {
  const formatGoals = context.goals?.length
    ? context.goals.join(', ')
    : 'Mindfulness & emotional balance';
  const formatMemories = context.memories?.length ? context.memories.join('; ') : 'None yet';
  const formatSummaries = context.conversationSummaries?.length
    ? context.conversationSummaries.join('; ')
    : 'None yet';

  const formatRecentMoods = context.recentMoods?.length
    ? context.recentMoods
        .map((m) => `${m.score}/5 (${m.emotions.join(', ') || 'neutral'}) on ${m.date}`)
        .join(', ')
    : 'No recent check-ins';

  const formatTodayMood = context.todayMood
    ? `${context.todayMood.score}/5 (${context.todayMood.emotions.join(', ')})${
        context.todayMood.note ? ` - "${context.todayMood.note}"` : ''
      }`
    : 'Not checked in yet today';

  return SOLA_SYSTEM_PROMPT_TEMPLATE.replace('{{name}}', context.name || 'Friend')
    .replace('{{goals}}', formatGoals)
    .replace('{{recentMoods}}', formatRecentMoods)
    .replace('{{todayMood}}', formatTodayMood)
    .replace('{{memories}}', formatMemories)
    .replace('{{conversationSummaries}}', formatSummaries);
}

/**
 * Parses Sola's raw response to extract activity proposals and memory updates
 */
export function parseSolaResponse(rawText: string): ParsedSolaResponse {
  let cleanContent = rawText;
  let suggestedActivity: ParsedSolaResponse['suggestedActivity'] = null;
  const newMemories: string[] = [];

  // Parse [[ACTIVITY:{...}]]
  const activityRegex = /\[\[ACTIVITY:(\{[\s\S]*?\})\]\]/g;
  const activityMatch = activityRegex.exec(rawText);
  if (activityMatch && activityMatch[1]) {
    try {
      suggestedActivity = JSON.parse(activityMatch[1]);
      cleanContent = cleanContent.replace(activityMatch[0], '').trim();
    } catch {
      // Fallback if model made small JSON typo
    }
  }

  // Parse [[MEMORY:"..."]]
  const memoryRegex = /\[\[MEMORY:\s*"([^"]+)"\s*\]\]/g;
  let memMatch: RegExpExecArray | null;
  while ((memMatch = memoryRegex.exec(rawText)) !== null) {
    if (memMatch[1]) {
      newMemories.push(memMatch[1].trim());
      cleanContent = cleanContent.replace(memMatch[0], '').trim();
    }
  }

  // Final output hygiene: strip leaked internal notes and any leftover markers
  // (unknown marker names, malformed JSON, or blocks left unclosed by the model).
  cleanContent = cleanContent
    .replace(/\{\{[\s\S]*?\}\}/g, '')
    .replace(/\{\{[\s\S]*$/g, '')
    .replace(/\[\[[\s\S]*?\]\]/g, '')
    .replace(/\[\[[\s\S]*$/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    cleanContent,
    suggestedActivity,
    newMemories,
  };
}
