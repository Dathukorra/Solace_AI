import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Sola } from '../../components/Sola';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../features/auth/authService';
import {
  syncPushTokenWithBackend,
  consumePendingNotification,
  handleNotificationNavigation,
} from '../../features/reminders/notificationService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export default function LoginScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const setAuth = useAuthStore((s) => s.setAuth);
  const finishOnboarding = useAuthStore((s) => s.finishOnboarding);

  const [email, setEmail] = useState(typeof emailParam === 'string' ? emailParam : '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Inline Validation States
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateEmail = (val: string): boolean => {
    if (!val.trim()) {
      setEmailError('Please enter your email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(undefined);
    return true;
  };

  const validatePassword = (val: string): boolean => {
    if (!val) {
      setPasswordError('Please enter your password');
      return false;
    }
    setPasswordError(undefined);
    return true;
  };

  const handleLogin = async () => {
    setGeneralError(null);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    try {
      setLoading(true);
      const res = await authService.login({
        email: email.trim(),
        password,
      });

      await setAuth(res.user, res.accessToken, res.refreshToken);
      finishOnboarding();

      // Get Expo push token and POST it to /push-tokens on login
      await syncPushTokenWithBackend().catch(() => {});

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Navigate to pending notification route if one was waiting for auth
      const pendingScreen = consumePendingNotification();
      if (pendingScreen) {
        handleNotificationNavigation(pendingScreen, router);
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const friendlyMessage =
        e.status === 401
          ? 'Incorrect email or password. Please try again.'
          : e.status === 429
            ? 'Too many login attempts. Please wait a moment.'
            : e.message || 'Unable to sign in right now. Please check your connection.';
      setGeneralError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const navigateToRegister = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/(auth)/register');
  };

  const navigateToForgotPassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/(auth)/forgot-password');
  };

  return (
    <Screen keyboardAvoiding contentContainerStyle={styles.container}>
      <View style={styles.content}>
        {/* Sola Header */}
        <View style={styles.header}>
          <Sola mood="calm" size={96} showGlow={true} />
          <Text variant="title" style={styles.title}>
            Welcome back to Solace
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
            A quiet space to pause, reflect, and find your center.
          </Text>
        </View>

        {/* Form Card */}
        <Card variant="frosted" style={styles.card}>
          {generalError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>🕊️</Text>
              <Text variant="bodySm" color={colors.error} style={styles.errorText}>
                {generalError}
              </Text>
            </View>
          )}

          {/* Email with Floating Label */}
          <Input
            label="Email address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) validateEmail(text);
            }}
            onBlur={() => validateEmail(email)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={emailError}
            editable={!loading}
          />

          {/* Password with Floating Label & Show/Hide Toggle */}
          <Input
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) validatePassword(text);
            }}
            onBlur={() => validatePassword(password)}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            error={passwordError}
            editable={!loading}
            rightIcon={
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Text variant="caption" color={colors.primaryDark}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            }
          />

          <Button
            title="Sign in"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={loading}
            onPress={handleLogin}
            style={styles.loginButton}
          />

          <Pressable onPress={navigateToForgotPassword} hitSlop={8} style={styles.forgotButton}>
            <Text variant="bodySm" color={colors.primaryDark}>
              Forgot password?
            </Text>
          </Pressable>
        </Card>

        {/* Footer Link */}
        <View style={styles.footer}>
          <Text variant="body" color={colors.textSecondary}>
            New to Solace?{' '}
          </Text>
          <Pressable onPress={navigateToRegister} hitSlop={8}>
            <Text variant="bodyMedium" color={colors.primaryDark}>
              Create an account
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    marginTop: spacing.md,
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'Nunito_800ExtraBold',
  },
  subtitle: {
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  card: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 232, 237, 0.72)',
    padding: spacing.sm,
    borderRadius: 16,
    gap: spacing.xs,
    borderColor: 'rgba(242, 107, 138, 0.28)',
    borderWidth: 1.5,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    flex: 1,
  },
  loginButton: {
    marginTop: spacing.xs,
    width: '100%',
  },
  forgotButton: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
