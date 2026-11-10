import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
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

const GOALS_OPTIONS = [
  { id: 'stress', label: 'Stress relief', emoji: '🌿' },
  { id: 'sleep', label: 'Better sleep', emoji: '🌙' },
  { id: 'focus', label: 'Daily focus', emoji: '🎯' },
  { id: 'anxiety', label: 'Easing anxiety', emoji: '🌊' },
  { id: 'mood', label: 'Mood balance', emoji: '☀️' },
  { id: 'self-esteem', label: 'Self-compassion', emoji: '💛' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const startOnboarding = useAuthStore((s) => s.startOnboarding);
  const finishOnboarding = useAuthStore((s) => s.finishOnboarding);
  const updateUser = useAuthStore((s) => s.updateUser);

  // Flow step: 0 = Account credentials, 1 = Nickname, 2 = Goals, 3 = Notifications
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3>(0);

  // Step 0: Credentials
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: Nickname / What should Sola call you
  const [preferredName, setPreferredName] = useState('');

  // Step 2: Multi-select Wellness Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  // Validation & Loading
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ─── Inline Validations ──────────────────────────────────────────────────

  const validateName = (val: string): boolean => {
    if (!val.trim() || val.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    setNameError(undefined);
    return true;
  };

  const validateEmail = (val: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val.trim() || !emailRegex.test(val.trim())) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(undefined);
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

  // ─── Step Handlers ───────────────────────────────────────────────────────

  // Step 0: Submit Signup
  const handleInitialSignup = async () => {
    setGeneralError(null);
    const isNameOk = validateName(name);
    const isEmailOk = validateEmail(email);
    const isPasswordOk = validatePassword(password);

    if (!isNameOk || !isEmailOk || !isPasswordOk) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    try {
      setLoading(true);
      const res = await authService.signup({
        name: name.trim(),
        email: email.trim(),
        password,
        goals: [],
      });

      // Keep AuthGuard from redirecting away while the profile steps are shown.
      startOnboarding();
      await setAuth(res.user, res.accessToken, res.refreshToken);
      setPreferredName(res.user.name || name.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Advance to 3-step profile setup: Step 1 (Nickname)
      setCurrentStep(1);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const friendlyMessage =
        e.status === 409
          ? 'An account with that email already exists. Try signing in instead.'
          : e.message || 'Unable to create account right now. Please try again.';
      setGeneralError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Save Nickname & proceed to Goals
  const handleSaveNameStep = async () => {
    const chosenName = preferredName.trim() || name.trim();
    try {
      setLoading(true);
      await authService.updateProfile({ name: chosenName });
      updateUser({ name: chosenName });
      Haptics.selectionAsync().catch(() => {});
      setCurrentStep(2);
    } catch {
      // Non-blocking fallback
      setCurrentStep(2);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Save Multi-select Goals & proceed to Notifications
  const toggleGoal = (goalId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((g) => g !== goalId) : [...prev, goalId]
    );
  };

  const handleSaveGoalsStep = async () => {
    try {
      setLoading(true);
      await authService.updateProfile({ goals: selectedGoals });
      updateUser({ goals: selectedGoals });
      Haptics.selectionAsync().catch(() => {});
      setCurrentStep(3);
    } catch {
      setCurrentStep(3);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Notification Permission Screen
  const handleRequestNotifications = async () => {
    try {
      setLoading(true);
      await syncPushTokenWithBackend().catch(() => {});
    } catch {
      // Permission rejected or simulated
    } finally {
      setLoading(false);
      finishOnboarding();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const pendingScreen = consumePendingNotification();
      if (pendingScreen) {
        handleNotificationNavigation(pendingScreen, router);
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  const handleSkipNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    finishOnboarding();
    const pendingScreen = consumePendingNotification();
    if (pendingScreen) {
      handleNotificationNavigation(pendingScreen, router);
    } else {
      router.replace('/(tabs)');
    }
  };

  // ─── Render Steps ────────────────────────────────────────────────────────

  return (
    <Screen keyboardAvoiding contentContainerStyle={styles.container}>
      <View style={styles.content}>
        {/* Step 0: Account Creation */}
        {currentStep === 0 && (
          <>
            <View style={styles.header}>
              <Sola mood="happy" size={96} showGlow={true} />
              <Text variant="title" style={styles.title}>
                Begin your journey with Solace
              </Text>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                Create an account to save your reflections, streak, and mood insights safely.
              </Text>
            </View>

            <Card variant="frosted" style={styles.card}>
              {generalError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorIcon}>🌱</Text>
                  <Text variant="bodySm" color={colors.error} style={styles.errorText}>
                    {generalError}
                  </Text>
                </View>
              )}

              <Input
                label="Full name"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError) validateName(text);
                }}
                onBlur={() => validateName(name)}
                autoCapitalize="words"
                error={nameError}
                editable={!loading}
              />

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

              <Input
                label="Password (min 8 characters, 1 uppercase, 1 number)"
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
                title="Create account"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={loading}
                onPress={handleInitialSignup}
                style={styles.actionButton}
              />
            </Card>

            <View style={styles.footer}>
              <Text variant="body" color={colors.textSecondary}>
                Already have an account?{' '}
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  router.push('/(auth)/login');
                }}
                hitSlop={8}
              >
                <Text variant="bodyMedium" color={colors.primaryDark}>
                  Sign in
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Step 1: What should Sola call you? */}
        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepProgressRow}>
              <View style={[styles.stepBar, styles.stepBarActive]} />
              <View style={styles.stepBar} />
              <View style={styles.stepBar} />
            </View>

            <View style={styles.header}>
              <Sola mood="listening" size={100} showGlow={true} />
              <Text variant="display" style={styles.stepTitle}>
                What should Sola call you?
              </Text>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                A first name, a nickname, or whatever feels warmest to you.
              </Text>
            </View>

            <Card variant="frosted" style={styles.card}>
              <Input
                label="Preferred name or nickname"
                value={preferredName}
                onChangeText={setPreferredName}
                autoCapitalize="words"
                editable={!loading}
              />

              <Button
                title="Continue"
                variant="primary"
                size="lg"
                loading={loading}
                onPress={handleSaveNameStep}
                style={styles.actionButton}
              />
            </Card>
          </View>
        )}

        {/* Step 2: What do you want help with? (Multi-select) */}
        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepProgressRow}>
              <View style={[styles.stepBar, styles.stepBarActive]} />
              <View style={[styles.stepBar, styles.stepBarActive]} />
              <View style={styles.stepBar} />
            </View>

            <View style={styles.header}>
              <Sola mood="thinking" size={100} showGlow={true} />
              <Text variant="display" style={styles.stepTitle}>
                What brings you to Solace?
              </Text>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                Select the areas you’d like gentle support with. You can change these anytime.
              </Text>
            </View>

            <Card variant="frosted" style={styles.card}>
              <View style={styles.chipsContainer}>
                {GOALS_OPTIONS.map((g) => {
                  const isSelected = selectedGoals.includes(g.id);
                  return (
                    <Chip
                      key={g.id}
                      label={g.label}
                      emoji={g.emoji}
                      selected={isSelected}
                      variant={isSelected ? 'sage' : 'outline'}
                      onPress={() => toggleGoal(g.id)}
                    />
                  );
                })}
              </View>

              <Button
                title={selectedGoals.length > 0 ? 'Continue' : 'Skip for now'}
                variant="primary"
                size="lg"
                loading={loading}
                onPress={handleSaveGoalsStep}
                style={styles.actionButton}
              />
            </Card>
          </View>
        )}

        {/* Step 3: Gentle Notification Permission */}
        {currentStep === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepProgressRow}>
              <View style={[styles.stepBar, styles.stepBarActive]} />
              <View style={[styles.stepBar, styles.stepBarActive]} />
              <View style={[styles.stepBar, styles.stepBarActive]} />
            </View>

            <View style={styles.header}>
              <Sola mood="calm" size={110} showGlow={true} />
              <Text variant="display" style={styles.stepTitle}>
                Gentle reminders on your terms
              </Text>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                We will never send guilt trips or spam. Only soft check-ins, mindful breathing
                pauses, and your daily affirmation when you need grounding.
              </Text>
            </View>

            <Card variant="frosted" style={styles.card}>
              <View style={styles.benefitList}>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitEmoji}>🌱</Text>
                  <Text variant="bodySm" color={colors.text}>
                    A morning affirmation to start your day centered
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitEmoji}>🌬️</Text>
                  <Text variant="bodySm" color={colors.text}>
                    A calm 2-minute pause when your afternoon gets hectic
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitEmoji}>🌙</Text>
                  <Text variant="bodySm" color={colors.text}>
                    Evening wind-down reflections to sleep more peacefully
                  </Text>
                </View>
              </View>

              <Button
                title="Enable gentle reminders"
                variant="primary"
                size="lg"
                loading={loading}
                onPress={handleRequestNotifications}
                style={styles.actionButton}
              />

              <Button
                title="Maybe later"
                variant="ghost"
                size="md"
                disabled={loading}
                onPress={handleSkipNotifications}
                style={styles.skipButton}
              />
            </Card>
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
    maxWidth: 440,
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
  stepTitle: {
    marginTop: spacing.md,
    fontSize: 26,
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'Nunito_800ExtraBold',
  },
  subtitle: {
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 22,
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
  actionButton: {
    marginTop: spacing.xs,
    width: '100%',
  },
  skipButton: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  stepContainer: {
    width: '100%',
  },
  stepProgressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
    justifyContent: 'center',
    width: '100%',
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(199, 155, 232, 0.18)',
  },
  stepBarActive: {
    backgroundColor: colors.primary,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  benefitList: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  benefitEmoji: {
    fontSize: 20,
  },
});
