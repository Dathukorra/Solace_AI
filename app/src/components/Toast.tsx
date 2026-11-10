import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import { Text } from './Text';

export type ToastVariant = 'success' | 'info' | 'mood' | 'error';

export interface ToastOptions {
  message: string;
  subtitle?: string;
  variant?: ToastVariant;
  durationMs?: number;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    translateY.value = withTiming(-120, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(setToast)(null);
      }
    });
  }, [translateY, opacity]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setToast(options);

      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 200 });

      const duration = options.durationMs || 3500;
      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [translateY, opacity, hideToast]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const getVariantStyles = (
    variant: ToastVariant = 'info'
  ): {
    container: ViewStyle;
    textColor: string;
    icon: string;
  } => {
    switch (variant) {
      case 'success':
        return {
          container: {
            backgroundColor: 'rgba(232, 247, 242, 0.9)',
            borderColor: 'rgba(255, 255, 255, 0.8)',
          },
          textColor: colors.text,
          icon: '🌿',
        };
      case 'mood':
        return {
          container: {
            backgroundColor: 'rgba(253, 232, 237, 0.92)',
            borderColor: 'rgba(255, 255, 255, 0.8)',
          },
          textColor: colors.text,
          icon: '✨',
        };
      case 'error':
        return {
          container: {
            backgroundColor: 'rgba(253, 232, 237, 0.94)',
            borderColor: 'rgba(255, 255, 255, 0.8)',
          },
          textColor: colors.error,
          icon: '🌱',
        };
      case 'info':
      default:
        return {
          container: {
            backgroundColor: 'rgba(246, 236, 252, 0.92)',
            borderColor: 'rgba(255, 255, 255, 0.8)',
          },
          textColor: colors.text,
          icon: '🕊️',
        };
    }
  };

  const vStyles = toast ? getVariantStyles(toast.variant) : getVariantStyles('info');

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Animated.View style={[styles.container, { top: insets.top + spacing[8] }, animatedStyle]}>
          <Pressable
            onPress={hideToast}
            accessibilityRole="alert"
            accessibilityLabel={toast.message}
            style={[styles.toast, vStyles.container, shadows.md]}
          >
            <Text style={styles.icon}>{toast.icon || vStyles.icon}</Text>
            <View style={styles.textContainer}>
              <Text variant="bodySm" style={[styles.message, { color: vStyles.textColor }]}>
                {toast.message}
              </Text>
              {toast.subtitle && (
                <Text variant="caption" color={colors.textSecondary}>
                  {toast.subtitle}
                </Text>
              )}
            </View>

            {toast.actionLabel && toast.onAction && (
              <Pressable
                onPress={() => {
                  toast.onAction?.();
                  hideToast();
                }}
                hitSlop={8}
                style={styles.actionButton}
              >
                <Text variant="bodySm" style={[styles.actionLabel, { color: vStyles.textColor }]}>
                  {toast.actionLabel}
                </Text>
              </Pressable>
            )}

            <View style={styles.dismissTarget}>
              <Text style={[styles.closeIcon, { color: vStyles.textColor }]}>✕</Text>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing[16],
    right: spacing[16],
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    minHeight: 52,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: spacing[12],
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontFamily: 'Nunito_700Bold',
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    marginRight: spacing.xs,
  },
  actionLabel: {
    fontFamily: 'Nunito_700Bold',
  },
  dismissTarget: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing[8],
  },
  closeIcon: {
    fontSize: 14,
    opacity: 0.7,
  },
});
