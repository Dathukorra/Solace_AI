import React from 'react';
import { TourProvider } from './TourContext';
import { TourOverlay } from './TourOverlay';
import type { TourStep } from './types';

/**
 * The first-run app tour. Target ids match the `useTourTarget` calls across
 * Home, the tab bar, and the Activities screen.
 *
 * Each step may name the route that owns its target. The provider navigates
 * there first and waits up to one second for the target to appear.
 */
export const HOME_TOUR_STEPS: TourStep[] = [
  {
    id: 'mood',
    targetId: 'home-mood-faces',
    route: '/(tabs)',
    title: 'Start with how you feel',
    description: 'Tap a face each day. Sola uses it to understand you better.',
  },
  {
    id: 'sola',
    targetId: 'tab-sola',
    route: '/(tabs)/chat',
    title: 'Talk to Sola',
    description: 'Share anything on your mind. Sola listens and remembers what you choose.',
  },
  {
    id: 'activities',
    targetId: 'activities-featured',
    route: '/(tabs)/activities',
    title: 'Small calming activities',
    description: 'Breathing, reflections and affirmations picked for your mood.',
  },
  {
    id: 'insights',
    targetId: 'tab-insights',
    route: '/(tabs)/mood',
    title: 'See your patterns',
    description: 'Track your mood and your streak over time.',
  },
  {
    id: 'reminders',
    targetId: 'home-reminders-bell',
    route: '/(tabs)',
    title: 'Gentle reminders',
    description: 'Choose when Sola nudges you. You are always in control.',
  },
];

interface AppTourProviderProps {
  children: React.ReactNode;
}

/** Mounts the app-wide tour context and its full-screen overlay. */
export const AppTourProvider: React.FC<AppTourProviderProps> = ({ children }) => (
  <TourProvider steps={HOME_TOUR_STEPS}>
    {children}
    <TourOverlay />
  </TourProvider>
);
