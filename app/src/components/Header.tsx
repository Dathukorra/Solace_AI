import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from './Text';
import { IconButton } from './IconButton';
import { spacing } from '../theme/spacing';
import { colors } from '../theme/colors';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  leftAction,
  rightAction,
  style,
}) => {
  const router = useRouter();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleRow}>
        {showBack && (
          <IconButton
            icon={<Text style={styles.backText}>←</Text>}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            variant="ghost"
            size="sm"
            style={styles.backButton}
          />
        )}
        {leftAction && !showBack && <View style={styles.leftAction}>{leftAction}</View>}
        <View style={styles.titleContainer}>
          <Text variant="title" color={colors.text}>
            {title}
          </Text>
          {subtitle && (
            <Text variant="caption" color={colors.textSecondary}>
              {subtitle}
            </Text>
          )}
        </View>
        {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[8],
    paddingTop: spacing[8],
    paddingBottom: spacing[12],
    backgroundColor: 'transparent',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftAction: {
    marginRight: spacing[8],
  },
  backButton: {
    marginRight: spacing[8],
    minWidth: 44,
    minHeight: 44,
  },
  backText: {
    fontSize: 22,
    color: colors.text,
  },
  titleContainer: {
    flex: 1,
  },
  rightAction: {
    marginLeft: spacing[8],
  },
});
