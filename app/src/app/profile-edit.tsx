import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { IconButton } from '../components/IconButton';
import { SelectField } from '../components/SelectField';
import { DatePickerField } from '../components/DatePickerField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useAuthStore } from '../store/authStore';
import { authService } from '../features/auth/authService';
import type { AuthUser, ProfileGender, UpdateProfilePayload } from '../features/auth/types';
import {
  GENDER_OPTIONS,
  MIN_DATE_OF_BIRTH,
  calculateAge,
  formatDateOfBirth,
  isValidDateOnly,
  isValidEmail,
  isValidPhoneNumber,
  normalizePhoneNumber,
  resolveAvatarUrl,
  todayIsoDate,
} from '../features/profile/profileUtils';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';

const FOCUS_AREA_OPTIONS = [
  'Anxiety Relief',
  'Better Sleep',
  'Daily Mindfulness',
  'Self-Reflection',
  'Focus & Calm',
  'Gratitude',
  'Stress Balance',
];

type AvatarDraft = { kind: 'unchanged' } | { kind: 'new'; dataUrl: string } | { kind: 'removed' };

interface FormSnapshotInput {
  name: string;
  email: string;
  age: string;
  gender: ProfileGender | null;
  dateOfBirth: string | null;
  phoneNumber: string;
  location: string;
  goals: string[];
  avatarKind: 'unchanged' | 'new' | 'removed';
}

interface FormErrors {
  name?: string;
  email?: string;
  age?: string;
  phoneNumber?: string;
  location?: string;
  dateOfBirth?: string;
}

function buildSnapshot(input: FormSnapshotInput): string {
  return JSON.stringify({
    name: input.name.trim(),
    email: input.email.trim(),
    age: input.age.trim(),
    gender: input.gender,
    dateOfBirth: input.dateOfBirth,
    phoneNumber: input.phoneNumber.trim(),
    location: input.location.trim(),
    goals: input.goals,
    avatar: input.avatarKind,
  });
}

function snapshotFromUser(user: AuthUser | null): string {
  return buildSnapshot({
    name: user?.name ?? '',
    email: user?.email ?? '',
    age: user?.age != null ? String(user.age) : '',
    gender: user?.gender ?? null,
    dateOfBirth: user?.dateOfBirth ?? null,
    phoneNumber: user?.phoneNumber ?? '',
    location: user?.location ?? '',
    goals: user?.goals ?? [],
    avatarKind: 'unchanged',
  });
}

export default function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isNarrow = width < 560;

  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [age, setAge] = useState(user?.age != null ? String(user.age) : '');
  const [gender, setGender] = useState<ProfileGender | null>(user?.gender ?? null);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(user?.dateOfBirth ?? null);
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [goals, setGoals] = useState<string[]>(user?.goals ?? []);
  const [avatarDraft, setAvatarDraft] = useState<AvatarDraft>({ kind: 'unchanged' });

  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [discardVisible, setDiscardVisible] = useState(false);

  const allowLeaveRef = useRef(false);
  const pendingActionRef = useRef<unknown>(null);
  const initialSnapshotRef = useRef(snapshotFromUser(user));

  const avatarUri =
    avatarDraft.kind === 'new'
      ? avatarDraft.dataUrl
      : avatarDraft.kind === 'removed'
        ? undefined
        : resolveAvatarUrl(user?.avatarUrl);
  const hasAvatar = Boolean(avatarUri);

  const currentSnapshot = buildSnapshot({
    name,
    email,
    age,
    gender,
    dateOfBirth,
    phoneNumber,
    location,
    goals,
    avatarKind: avatarDraft.kind,
  });
  const isDirty = currentSnapshot !== initialSnapshotRef.current;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  useEffect(() => {
    const nav = navigation as unknown as {
      addListener: (
        event: string,
        handler: (event: { preventDefault: () => void; data: { action: unknown } }) => void
      ) => () => void;
      dispatch: (action: unknown) => void;
    };

    const unsubscribe = nav.addListener('beforeRemove', (event) => {
      if (!isDirty || allowLeaveRef.current) return;
      event.preventDefault();
      pendingActionRef.current = event.data.action;
      setDiscardVisible(true);
    });

    return unsubscribe;
  }, [navigation, isDirty]);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      nextErrors.name = 'Please enter your full name';
    } else if (trimmedName.length < 2) {
      nextErrors.name = 'Name must be at least 2 characters';
    } else if (trimmedName.length > 50) {
      nextErrors.name = 'Name must be 50 characters or fewer';
    }

    if (!email.trim()) {
      nextErrors.email = 'Please enter your email address';
    } else if (!isValidEmail(email)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (age.trim()) {
      const parsedAge = Number(age);
      if (!Number.isInteger(parsedAge) || parsedAge < 1) {
        nextErrors.age = 'Age must be a positive whole number';
      } else if (parsedAge > 120) {
        nextErrors.age = 'Age must be 120 or younger';
      }
    }

    if (dateOfBirth) {
      if (!isValidDateOnly(dateOfBirth)) {
        nextErrors.dateOfBirth = 'Enter a valid date of birth';
      } else if (dateOfBirth < MIN_DATE_OF_BIRTH) {
        nextErrors.dateOfBirth = 'Date of birth is too far in the past';
      } else if (dateOfBirth > todayIsoDate()) {
        nextErrors.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }

    if (phoneNumber.trim() && !isValidPhoneNumber(phoneNumber)) {
      nextErrors.phoneNumber = 'Enter a valid phone number (7-15 digits)';
    }

    if (location.trim().length > 120) {
      nextErrors.location = 'Location must be 120 characters or fewer';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleDateOfBirthChange = (next: string | null) => {
    setDateOfBirth(next);
    setErrors((previous) => ({
      ...previous,
      dateOfBirth: undefined,
      age: undefined,
    }));

    if (next && isValidDateOnly(next)) {
      setAge(String(calculateAge(next)));
    }
  };

  const toggleGoal = (goal: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setGoals((previous) =>
      previous.includes(goal) ? previous.filter((item) => item !== goal) : [...previous, goal]
    );
  };

  const pickAvatar = async () => {
    setApiError(null);
    try {
      setPicking(true);

      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showToast({
            message: 'Photo access is needed to choose a profile picture',
            variant: 'info',
          });
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const dataUrl = asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri.startsWith('data:')
          ? asset.uri
          : null;

      if (!dataUrl) {
        showToast({
          message: 'Could not read that image. Please choose another.',
          variant: 'error',
        });
        return;
      }

      if (dataUrl.length > 2_900_000) {
        showToast({
          message: 'That image is too large. Please choose one under 2 MB.',
          variant: 'error',
        });
        return;
      }

      setAvatarDraft({ kind: 'new', dataUrl });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      showToast({ message: 'Could not open your photo library', variant: 'error' });
    } finally {
      setPicking(false);
    }
  };

  const removeAvatar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setAvatarDraft(user?.avatarUrl ? { kind: 'removed' } : { kind: 'unchanged' });
  };

  const handleSave = async () => {
    setApiError(null);

    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    const payload: UpdateProfilePayload = {
      name: name.trim(),
      email: email.trim(),
      goals,
      age: age.trim() ? Number(age) : null,
      gender,
      dateOfBirth,
      phoneNumber: phoneNumber.trim() ? normalizePhoneNumber(phoneNumber) : null,
      location: location.trim() || null,
    };

    if (avatarDraft.kind === 'new') {
      payload.avatar = avatarDraft.dataUrl;
    } else if (avatarDraft.kind === 'removed') {
      payload.avatar = null;
    }

    try {
      setSaving(true);
      const response = await authService.updateProfile(payload);
      const updated = response.user;

      updateUser(updated);
      setName(updated.name);
      setEmail(updated.email);
      setAge(updated.age != null ? String(updated.age) : '');
      setGender(updated.gender ?? null);
      setDateOfBirth(updated.dateOfBirth ?? null);
      setPhoneNumber(updated.phoneNumber ?? '');
      setLocation(updated.location ?? '');
      setGoals(updated.goals ?? []);
      setAvatarDraft({ kind: 'unchanged' });
      initialSnapshotRef.current = snapshotFromUser(updated);
      allowLeaveRef.current = true;

      showToast({
        message: 'Profile updated ✨',
        subtitle: 'Your changes are saved.',
        variant: 'success',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      goBack();
    } catch (error: unknown) {
      const apiFailure = error as { status?: number; message?: string };
      let message = 'We could not save your profile. Please try again.';

      if (apiFailure.status === 409) {
        message = 'That email address is already in use. Please choose another.';
      } else if (apiFailure.status === 401) {
        message = 'Your session expired. Please sign in again.';
      } else if (apiFailure.status === 400 && apiFailure.message) {
        message = apiFailure.message;
      } else if (
        apiFailure.message?.toLowerCase().includes('network') ||
        apiFailure.message?.toLowerCase().includes('fetch')
      ) {
        message = 'We could not reach the server. Check your connection and try again.';
      }

      setApiError(message);
      showToast({ message, variant: 'error' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!isDirty) {
      goBack();
      return;
    }
    pendingActionRef.current = null;
    setDiscardVisible(true);
  };

  const confirmDiscard = () => {
    setDiscardVisible(false);
    allowLeaveRef.current = true;
    const action = pendingActionRef.current;
    pendingActionRef.current = null;

    if (action) {
      (navigation as unknown as { dispatch: (action: unknown) => void }).dispatch(action);
    } else {
      goBack();
    }
  };

  const formattedDateOfBirth = formatDateOfBirth(dateOfBirth);

  return (
    <Screen scrollable contentContainerStyle={styles.screenContent}>
      <View style={styles.page}>
        <Header
          title="Edit Profile"
          subtitle="Your personal information"
          leftAction={
            <IconButton
              icon={<Text style={styles.backText}>←</Text>}
              onPress={handleCancel}
              accessibilityLabel="Go back"
              variant="ghost"
              size="sm"
            />
          }
        />

        <View style={styles.body}>
          <Card variant="frosted" radius={28} shadow="sm" style={styles.avatarCard}>
            <View style={styles.avatarBlock}>
              <Pressable
                onPress={pickAvatar}
                disabled={saving || picking}
                accessibilityRole="button"
                accessibilityLabel="Change profile picture"
                style={styles.avatarPressable}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                      {name.trim() ? name.trim().charAt(0).toUpperCase() : 'S'}
                    </Text>
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Text style={styles.cameraBadgeText}>📷</Text>
                </View>
              </Pressable>

              <Text variant="titleSm" align="center" style={styles.avatarName}>
                {name.trim() || 'Your name'}
              </Text>
              <Text variant="caption" color={colors.textMuted} align="center">
                {formattedDateOfBirth || 'Add a profile photo and personal details'}
              </Text>

              <View style={styles.avatarActions}>
                <Button
                  title={hasAvatar ? 'Change photo' : 'Upload photo'}
                  variant="soft"
                  size="sm"
                  onPress={pickAvatar}
                  loading={picking}
                  disabled={saving}
                />
                {hasAvatar && (
                  <Button
                    title="Remove"
                    variant="ghost"
                    size="sm"
                    onPress={removeAvatar}
                    disabled={saving || picking}
                  />
                )}
              </View>

              <Text variant="captionSm" color={colors.textMuted} align="center">
                JPG, PNG or WebP, up to 2 MB.
              </Text>
            </View>
          </Card>

          {apiError && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Text style={styles.bannerIcon}>🕊️</Text>
              <View style={styles.bannerBody}>
                <Text variant="bodySm" color={colors.error} style={styles.bannerTitle}>
                  Changes could not be saved
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {apiError}
                </Text>
              </View>
            </View>
          )}

          <Card variant="frosted" radius={28} shadow="sm" style={styles.sectionCard}>
            <Text variant="titleSm" style={styles.sectionTitle}>
              Personal information
            </Text>
            <Text variant="caption" color={colors.textSecondary} style={styles.sectionSubtitle}>
              Keep this up to date so Sola can support you warmly.
            </Text>

            <Input
              label="Full name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((previous) => ({ ...previous, name: undefined }));
              }}
              autoCapitalize="words"
              autoComplete="name"
              error={errors.name}
              editable={!saving}
              maxLength={50}
            />

            <Input
              label="Email address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((previous) => ({ ...previous, email: undefined }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              error={errors.email}
              editable={!saving}
              helperText="Changing this updates the email you sign in with."
            />

            <Input
              label="Mobile number (optional)"
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                if (errors.phoneNumber) {
                  setErrors((previous) => ({ ...previous, phoneNumber: undefined }));
                }
              }}
              keyboardType="phone-pad"
              autoComplete="tel"
              error={errors.phoneNumber}
              editable={!saving}
            />

            <DatePickerField
              label="Date of birth"
              value={dateOfBirth}
              onChange={handleDateOfBirthChange}
              minimumDate={MIN_DATE_OF_BIRTH}
              maximumDate={todayIsoDate()}
              error={errors.dateOfBirth}
              helperText="Your age is calculated automatically when you pick a date."
              disabled={saving}
            />

            <View style={[styles.row, isNarrow && styles.rowStacked]}>
              <Input
                label="Age"
                value={age}
                onChangeText={(text) => {
                  setAge(text.replace(/[^0-9]/g, ''));
                  if (errors.age) setErrors((previous) => ({ ...previous, age: undefined }));
                }}
                keyboardType="number-pad"
                maxLength={3}
                error={errors.age}
                editable={!saving}
                containerStyle={styles.rowField}
              />

              <SelectField
                label="Gender"
                value={gender}
                options={GENDER_OPTIONS}
                onChange={(value) => {
                  setGender(value);
                  Haptics.selectionAsync().catch(() => {});
                }}
                placeholder="Select gender"
                modalTitle="Gender"
                disabled={saving}
                containerStyle={styles.rowField}
              />
            </View>

            <Input
              label="Location (optional)"
              value={location}
              onChangeText={(text) => {
                setLocation(text);
                if (errors.location)
                  setErrors((previous) => ({ ...previous, location: undefined }));
              }}
              autoCapitalize="words"
              error={errors.location}
              editable={!saving}
              maxLength={120}
            />
          </Card>

          <Card variant="frosted" radius={28} shadow="sm" style={styles.sectionCard}>
            <Text variant="titleSm" style={styles.sectionTitle}>
              Focus areas
            </Text>
            <Text variant="caption" color={colors.textSecondary} style={styles.sectionSubtitle}>
              Choose what you would like Sola to gently support.
            </Text>

            <View style={styles.goalsRow}>
              {FOCUS_AREA_OPTIONS.map((goal) => (
                <Chip
                  key={goal}
                  label={goal}
                  variant="outline"
                  selected={goals.includes(goal)}
                  onPress={() => toggleGoal(goal)}
                  disabled={saving}
                />
              ))}
            </View>
          </Card>

          <View style={[styles.actions, isNarrow && styles.actionsStacked]}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={handleCancel}
              disabled={saving || picking}
              style={styles.actionButton}
            />
            <Button
              title="Save Changes"
              variant="primary"
              onPress={handleSave}
              loading={saving}
              disabled={saving || picking}
              style={styles.actionButton}
            />
          </View>

          <Text
            variant="captionSm"
            color={colors.textMuted}
            align="center"
            style={styles.privacyNote}
          >
            Your personal details are only visible to you and are never shared.
          </Text>
        </View>
      </View>

      <ConfirmDialog
        visible={discardVisible}
        title="Discard changes?"
        message="You have unsaved changes. If you leave now, your edits will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={confirmDiscard}
        onCancel={() => {
          pendingActionRef.current = null;
          setDiscardVisible(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    paddingBottom: spacing[32],
  },
  page: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  body: {
    paddingHorizontal: spacing[16],
    gap: spacing[12],
  },
  backText: {
    fontSize: 22,
    color: colors.text,
  },
  avatarCard: {
    padding: spacing[16],
  },
  avatarBlock: {
    alignItems: 'center',
    gap: spacing[8],
  },
  avatarPressable: {
    width: 112,
    height: 112,
    marginBottom: spacing[4],
  },
  avatarImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.primaryLight,
  },
  avatarFallback: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 42,
    color: colors.textInverse,
    fontFamily: fonts.display.extraBold,
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadgeText: {
    fontSize: 16,
  },
  avatarName: {
    color: colors.text,
  },
  avatarActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[8],
    marginTop: spacing[4],
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(253, 232, 237, 0.72)',
    padding: spacing[12],
    borderRadius: 20,
    gap: spacing[8],
    borderColor: 'rgba(242, 107, 138, 0.28)',
    borderWidth: 1.5,
  },
  bannerIcon: {
    fontSize: 16,
  },
  bannerBody: {
    flex: 1,
  },
  bannerTitle: {
    fontFamily: fonts.body.semiBold,
    marginBottom: 2,
  },
  sectionCard: {
    padding: spacing[16],
  },
  sectionTitle: {
    color: colors.text,
  },
  sectionSubtitle: {
    marginTop: 2,
    marginBottom: spacing[16],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  rowStacked: {
    flexDirection: 'column',
    gap: 0,
  },
  rowField: {
    flex: 1,
  },
  goalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[12],
    marginTop: spacing[4],
  },
  actionsStacked: {
    flexDirection: 'column-reverse',
  },
  actionButton: {
    flex: 1,
  },
  privacyNote: {
    marginTop: spacing[4],
    paddingHorizontal: spacing[16],
  },
});
