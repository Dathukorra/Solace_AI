import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import {
  consumePendingNotification,
  handleNotificationNavigation,
} from '../features/reminders/notificationService';
import { colors } from '../theme/colors';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, isOnboarding, initializeAuth } = useAuthStore();

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isSplash = (segments as string[]).length === 0 || (segments as string[])[0] === 'index';

    // If on splash screen, splash handles initial redirect logic
    if (isSplash) return;

    if (!isAuthenticated && !inAuthGroup) {
      // User is trying to access protected tabs or modal while unauthenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup && !isOnboarding) {
      // User is already logged in but visiting login/register/onboarding
      const pendingScreen = consumePendingNotification();
      if (pendingScreen) {
        handleNotificationNavigation(pendingScreen, router);
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, isOnboarding, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
