/**
 * Curated Collection of 60 Mindful, Grounded Affirmations
 *
 * Focuses on emotional safety, self-compassion, presence, and gentle acceptance.
 * Avoids toxic positivity, clichés, and dismissive language.
 */

export const CURATED_AFFIRMATIONS: string[] = [
  'You do not have to have everything figured out to move forward gently.',
  'Your feelings are valid, even the complicated and quiet ones.',
  'It is safe to slow down and breathe before responding to the world.',
  'You are allowed to take up space exactly as you are today.',
  'Rest is not something you must earn; it is something you naturally need.',
  'One small, kind choice for yourself is enough for this morning.',
  'You are resilient, even on the days you feel fragile.',
  'It is okay to let today be simple and unhurried.',
  'Your worth is steady, regardless of how much you accomplish today.',
  'You have survived every difficult day before this one.',
  'Give yourself permission to pause when things feel loud.',
  'You do not need to carry everyone else’s expectations on your shoulders.',
  'Gentleness toward yourself is a strength, not a weakness.',
  'Whatever you are feeling right now is allowed to be here.',
  'Peace begins with the breath you are taking right now.',
  'You are learning and growing, and that takes quiet time.',
  'Trust your pace; you do not need to race through life.',
  'A calm mind comes from accepting the moment, not controlling it.',
  'You are more than your worries or passing thoughts.',
  'Be proud of yourself for showing up, even in small ways.',
  'You deserve the same patience you so easily give to others.',
  'It is okay to say no to protect your inner energy.',
  'Your body does so much for you; offer it gratitude today.',
  'Healing happens in ordinary, gentle moments.',
  'You do not have to fix everything right now.',
  'Release the need for perfection; presence is what matters.',
  'You are doing the best you can with what you have today.',
  'Every breath is an invitation to begin again without judgment.',
  'Kindness starts within your own heart and thoughts.',
  'You can handle uncertainty one steady step at a time.',
  'Notice the small pockets of comfort around you today.',
  'Your boundaries are a healthy reflection of self-respect.',
  'You are worthy of love and warmth, simply because you exist.',
  'Let go of yesterday; today is an open, unwritten space.',
  'When you feel overwhelmed, focus on just the next small thing.',
  'You have the courage to meet whatever this day brings.',
  'Allow yourself to feel proud of how far you have already come.',
  'There is quiet strength in simply listening to yourself.',
  'You do not have to carry the weight of tomorrow right now.',
  'It is okay to ask for support when the load feels heavy.',
  'Your presence makes a quiet, meaningful difference to this world.',
  'Choose compassion over criticism whenever you are in doubt.',
  'Today is a safe place to practice being patient with yourself.',
  'Notice what feels grounding, and give yourself a few moments there.',
  'You are allowed to change your mind and protect your peace.',
  'Difficult feelings are visitors; they will arrive, and they will pass.',
  'You hold within you a steady, quiet center of calm.',
  'Trust that you have what it takes to navigate this chapter.',
  'A gentle breath in, a gentle breath out. That is enough for now.',
  'You are deserving of quiet moments and deep rest.',
  'Let your heart be soft, and let your mind be still.',
  'Celebrate the quiet victories that no one else sees.',
  'You are stronger than the temporary clouds passing overhead.',
  'Allow yourself to receive goodness, comfort, and care today.',
  'Nothing is permanent; you are always in the process of renewing.',
  'Your story has value, nuance, and beautiful possibilities ahead.',
  'Treat yourself like someone you love dearly.',
  'You can always return home to your breath and center.',
  'Small steps taken with care lead to deep, lasting peace.',
  'You are safe right now, in this breath, in this present moment.',
];

/**
 * Deterministically picks a base affirmation for a date
 */
export function getDeterministicAffirmation(dateStr: string): { index: number; text: string } {
  // Simple deterministic hash of the YYYY-MM-DD string
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CURATED_AFFIRMATIONS.length;
  return {
    index,
    text: CURATED_AFFIRMATIONS[index],
  };
}
