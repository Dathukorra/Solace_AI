import { MoodLevel } from '../../store/moodStore';
import { colors } from '../../theme/colors';

export interface MoodOption {
  level: MoodLevel;
  score: 1 | 2 | 3 | 4 | 5;
  label: string;
  emoji: string;
  color: string;
  gradient: readonly [string, string];
}

export const MOOD_OPTIONS: MoodOption[] = [
  {
    level: 'rough',
    score: 1,
    label: 'Sad',
    emoji: '🌧️',
    color: '#FFD66B',
    gradient: colors.moodGradients[1], // 1 sad = muted blue
  },
  {
    level: 'low',
    score: 2,
    label: 'Low',
    emoji: '☁️',
    color: '#6B7280',
    gradient: colors.moodGradients[2],
  },
  {
    level: 'okay',
    score: 3,
    label: 'Neutral',
    emoji: '🪻',
    color: '#C79BE8',
    gradient: colors.moodGradients[3], // 3 neutral = lavender
  },
  {
    level: 'good',
    score: 4,
    label: 'Good',
    emoji: '🌿',
    color: '#9ED8C6',
    gradient: colors.moodGradients[4],
  },
  {
    level: 'great',
    score: 5,
    label: 'Happy',
    emoji: '🍑',
    color: '#F26B8A',
    gradient: colors.moodGradients[5], // 5 happy = warm peach
  },
];
