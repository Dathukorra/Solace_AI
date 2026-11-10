import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Sola } from '../../components/Sola';
import { authService } from '../../features/auth/authService';
import type { ForgotPasswordResponse } from '../../features/auth/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null);

  const validateEmail = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) {
      setEmailError('Please enter your email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(undefined);
    return true;
  };

  const handleSubmit = async () => {
    setGeneralError(null);
    if (!validateEmail(email)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    try {
      setLoading(true);
      const res = await authService.forgotPassword(email.trim());
      setResult(res);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const friendlyMessage =
        e.status === 429
          ? 'Too many reset attempts. Please wait a few minutes and try again.'
          : e.message || 'Unable to send a reset link right now. Please check your connection.';
      setGeneralError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const continueToReset = () => {
    if (!result?.resetToken) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push({
      pathname: '/(auth)/reset-password',
      params: { token: result.resetToken, email: email.trim() },
    });
  };

  const goToLogin = () => {
    router.replace('/(auth)/login');
  };

  return (
    <Screen keyboardAvoiding contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Sola mood="listening" size={88} showGlow={true} />
          <Text variant="title" style={styles.title}>
            Let&apos;s get you back in
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
            It happens to all of us. Enter the email you used for Solace and we&apos;ll help you
            reset your password.
          </Text>
        </View>

        <Card variant="frosted" style={styles.card}>
          {generalError && (
            <View style={styles.errorBanner}>
              <Text style={styles.bannerIcon}>🕊️</Text>
              <Text variant="bodySm" color={colors.error} style={styles.bannerText}>
                {generalError}
              </Text>
            </View>
          )}

          {result ? (
            <View style={styles.resultBlock}>
              <Text style={styles.resultIcon}>{result.resetToken ? '🌿' : '📬'}</Text>
              <Text variant="titleSm" align="center" style={styles.resultTitle}>
                {result.resetToken ? 'Your reset link is ready' : 'Check your inbox'}
              </Text>
              <Text variant="bodySm" color={colors.textSecondary} align="center">
                {result.resetToken
                  ? `This is a development build, so the secure reset link is shown here instead of being emailed. It expires in ${
                      result.expiresInMinutes ?? 30
                    } minutes.`
                  : 'If an account exists for that email, you will receive password reset instructions shortly.'}
              </Text>

              {result.resetToken ? (
                <Button
                  title="Choose a new password"
                  variant="primary"
                  size="lg"
                  onPress={continueToReset}
                  style={styles.primaryButton}
                />
              ) : null}

              <Button
                title="Back to sign in"
                variant="ghost"
                onPress={goToLogin}
                style={styles.secondaryButton}
              />
            </View>
          ) : (
            <>
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

              <Button
                title="Send reset link"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={loading}
                onPress={handleSubmit}
                style={styles.primaryButton}
              />
            </>
          )}
        </Card>

        {!result && (
          <View style={styles.footer}>
            <Pressable onPress={goToLogin} hitSlop={8}>
              <Text variant="bodyMedium" color={colors.primaryDark}>
                Back to sign in
              </Text>
            </Pressable>
          </View>
        )}
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
  bannerIcon: {
    fontSize: 16,
  },
  bannerText: {
    flex: 1,
  },
  primaryButton: {
    marginTop: spacing.xs,
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
  },
  resultBlock: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  resultIcon: {
    fontSize: 40,
  },
  resultTitle: {
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
