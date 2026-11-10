export interface ActivityItem {
  id: string;
  title: string;
  category: 'breathing' | 'meditation' | 'journaling' | 'movement';
  durationMinutes: number;
  description: string;
  icon: string;
}
