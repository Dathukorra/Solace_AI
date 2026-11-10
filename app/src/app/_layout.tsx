import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { QueryProvider } from '../api/QueryProvider';
import { ToastProvider } from '../components/Toast';
import { AuthGuard } from '../components/AuthGuard';
import { AppTourProvider } from '../features/tour';
import { useNotificationObserver } from '../features/reminders/notificationService';
import { colors } from '../theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useNotificationObserver();

  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryProvider>
      <ToastProvider>
        <AppTourProvider>
          <AuthGuard>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" options={{ presentation: 'card' }} />
              <Stack.Screen
                name="breathing"
                options={{ presentation: 'fullScreenModal', headerShown: false }}
              />
              <Stack.Screen
                name="profile-edit"
                options={{ presentation: 'card', headerShown: false }}
              />
              <Stack.Screen
                name="reminders"
                options={{ presentation: 'card', headerShown: false }}
              />
              <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
            </Stack>
          </AuthGuard>
        </AppTourProvider>
      </ToastProvider>
    </QueryProvider>
  );
}
