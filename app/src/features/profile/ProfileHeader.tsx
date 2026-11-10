import React from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import { formatDateOfBirth, genderLabel, resolveAvatarUrl } from './profileUtils';

export const ProfileHeader: React.FC = () => {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const avatarUri = resolveAvatarUrl(user?.avatarUrl);

  const openEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/profile-edit');
  };

  const details = [
    { label: 'Age', value: user?.age ? `${user.age} years` : null },
    { label: 'Date of birth', value: formatDateOfBirth(user?.dateOfBirth) },
    { label: 'Gender', value: genderLabel(user?.gender) },
    { label: 'Mobile', value: user?.phoneNumber },
    { label: 'Location', value: user?.location },
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail.value));

  return (
    <Card variant="frosted" radius={28} shadow="sm" style={styles.card}>
      <View style={styles.topRow}>
        <Pressable
          onPress={openEditProfile}
          accessibilityRole="button"
          accessibilityLabel="Change profile picture"
          style={styles.avatarPressable}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>✎</Text>
          </View>
        </Pressable>

        <View style={styles.info}>
          <Text variant="titleSm" color={colors.text}>
            {user?.name || 'Solace Member'}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {user?.email || 'member@solace.ai'}
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.memberBadge}>
              <Text style={styles.badgeText}>Mindful Seeker</Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={openEditProfile}
          style={styles.editBtn}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
      </View>

      {user?.goals && user.goals.length > 0 && (
        <View style={styles.goalsContainer}>
          <Text variant="caption" color={colors.textMuted} style={styles.goalsLabel}>
            Your Focus Areas:
          </Text>
          <View style={styles.goalsRow}>
            {user.goals.map((goal) => (
              <View key={goal} style={styles.goalChip}>
                <Text variant="caption" color={colors.primaryDark}>
                  • {goal}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.detailsContainer}>
        {details.length > 0 ? (
          <View style={styles.detailsGrid}>
            {details.map((detail) => (
              <View key={detail.label} style={styles.detailItem}>
                <Text variant="captionSm" color={colors.textMuted} style={styles.detailLabel}>
                  {detail.label}
                </Text>
                <Text variant="bodySm" color={colors.text} numberOfLines={1}>
                  {detail.value}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="caption" color={colors.textMuted}>
            Add your birthday, phone, and location to personalize your space.
          </Text>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing[16],
    marginBottom: spacing[12],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPressable: {
    width: 64,
    height: 64,
    marginRight: spacing[12],
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
  },
  avatarText: {
    fontSize: 24,
    color: colors.textInverse,
    fontWeight: 'bold',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  info: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  memberBadge: {
    backgroundColor: 'rgba(166, 61, 232, 0.12)',
    paddingHorizontal: spacing[8],
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  badgeText: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  editBtn: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    minHeight: 44,
    justifyContent: 'center',
  },
  editBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  goalsContainer: {
    marginTop: spacing[12],
    paddingTop: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  goalsLabel: {
    marginBottom: spacing[4],
  },
  goalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  goalChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    paddingHorizontal: spacing[8],
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  detailsContainer: {
    marginTop: spacing[12],
    paddingTop: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[12],
  },
  detailItem: {
    flexBasis: '46%',
    flexGrow: 1,
    minWidth: 130,
  },
  detailLabel: {
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
