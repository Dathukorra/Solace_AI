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
import { authService } from '../../features/auth/authService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const tokenFromLink = typeof params.token === 'string' ? params.token : '';
  const email = typeof params.email === 'string' ? params.email : '';

  const [token, setToken] = useState(tokenFromLink);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [tokenError, setTokenError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [confirmError, setConfirmError] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateToken = (val: string): boolean => {
    if (!val.trim()) {
      setTokenError('Please enter your reset code');
      return false;
    }
    if (val.trim().length < 16) {
      setTokenError('That reset code looks too short');
      return false;
    }
    setTokenError(undefined);
    return true;
  };

  const validatePassword = (val: string): boolean => {
    if (val.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    if (!/[A-Z]/.test(val)) {
      setPasswordError('Include at least one uppercase letter');
      return false;
    }
    if (!/[0-9]/.test(val)) {
      setPasswordError('Include at least one number');
      return false;
    }
    setPasswordError(undefined);
    return true;
  };

  const validateConfirm = (val: string, passwordValue = password): boolean => {
    if (!val) {
      setConfirmError('Please confirm your new password');
      return false;
    }
    if (val !== passwordValue) {
      setConfirmError('Passwords do not match');
      return false;
    }
    setConfirmError(undefined);
    return true;
  };

  const handleReset = async () => {
    setGeneralError(null);
    const isTokenValid = validateToken(token);
    const isPasswordValid = validatePassword(password);
    const isConfirmValid = validateConfirm(confirmPassword);

    if (!isTokenValid || !isPasswordValid || !isConfirmValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    try {
      setLoading(true);
      await authService.resetPassword({ token: token.trim(), password });
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const friendlyMessage =
        e.status === 429
          ? 'Too many reset attempts. Please wait a few minutes and try again.'
          : e.status === 400
            ? e.message || 'This reset link is invalid or has expired. Please request a new one.'
            : e.message || 'Unable to reset your password right now. Please check your connection.';
      setGeneralError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    if (email) {
      router.replace({ pathname: '/(auth)/login', params: { email } });
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <Screen keyboardAvoiding contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Sola mood={success ? 'happy' : 'calm'} size={88} showGlow={true} />
          <Text variant="title" style={styles.title}>
            {success ? "You're all set" : 'Choose a new password'}
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
            {success
              ? 'Your password has been updated. Sign in with your new password whenever you are ready.'
              : 'Create a password with at least 8 characters, one uppercase letter, and one number.'}
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

          {success ? (
            <View style={styles.successBlock}>
              <Text style={styles.successIcon}>🌿</Text>
              <Button
                title="Back to sign in"
                variant="primary"
                size="lg"
                onPress={goToLogin}
                style={styles.primaryButton}
              />
            </View>
          ) : (
            <>
              <Input
                label="Reset code"
                value={token}
                onChangeText={(text) => {
                  setToken(text);
                  if (tokenError) validateToken(text);
                }}
                onBlur={() => validateToken(token)}
                autoCapitalize="none"
                autoCorrect={false}
                error={tokenError}
                helperText={
                  tokenFromLink
                    ? 'Your reset code is filled in from the link.'
                    : 'Paste the reset code from your reset link or email.'
                }
                editable={!loading}
              />

              <Input
                label="New password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) validatePassword(text);
                  if (confirmError) validateConfirm(confirmPassword, text);
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

              <Input
                label="Confirm new password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmError) validateConfirm(text);
                }}
                onBlur={() => validateConfirm(confirmPassword)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                error={confirmError}
                editable={!loading}
              />

              <Button
                title="Update password"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={loading}
                onPress={handleReset}
                style={styles.primaryButton}
              />
            </>
          )}
        </Card>

        {!success && (
          <View style={styles.footer}>
            <Pressable onPress={() => router.replace('/(auth)/forgot-password')} hitSlop={8}>
              <Text variant="bodyMedium" color={colors.primaryDark}>
                Request a new reset link
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
  successBlock: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  successIcon: {
    fontSize: 40,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
