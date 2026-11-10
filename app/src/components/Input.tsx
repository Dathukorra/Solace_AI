import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import { Text } from './Text';

export interface InputProps extends Omit<TextInputProps, 'placeholder'> {
  label: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  value,
  defaultValue,
  onFocus,
  onBlur,
  editable = true,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value || defaultValue || '');
  const inputRef = useRef<TextInput>(null);

  const hasValue = (value !== undefined ? value : internalValue).length > 0;
  const isFloating = isFocused || hasValue;

  const floatProgress = useSharedValue(isFloating ? 1 : 0);

  useEffect(() => {
    floatProgress.value = withTiming(isFloating ? 1 : 0, { duration: 180 });
  }, [isFloating, floatProgress]);

  const animatedLabelStyle = useAnimatedStyle(() => {
    // Moves label from vertical center to top
    const translateY = floatProgress.value * -20;
    const scale = 1 - floatProgress.value * 0.18;
    const labelColor = interpolateColor(
      floatProgress.value,
      [0, 1],
      [colors.textMuted, isFocused ? colors.primary : colors.textSecondary]
    );

    return {
      transform: [{ translateY }, { scale }, { translateX: floatProgress.value * -6 }],
      color: labelColor,
    };
  });

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleChangeText = (text: string) => {
    if (value === undefined) {
      setInternalValue(text);
    }
    props.onChangeText?.(text);
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.container,
          isFocused && styles.focused,
          !!error && styles.errorContainer,
          !editable && styles.disabled,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        <View style={styles.inputArea}>
          <Animated.Text style={[styles.floatingLabel, animatedLabelStyle]}>{label}</Animated.Text>

          <TextInput
            ref={inputRef}
            value={value}
            defaultValue={defaultValue}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={editable}
            placeholderTextColor="transparent"
            style={[styles.input, inputStyle]}
            {...props}
          />
        </View>

        {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
      </Pressable>

      {error ? (
        <Text variant="caption" color={colors.error} style={styles.helper}>
          {error}
        </Text>
      ) : helperText ? (
        <Text variant="caption" color={colors.textMuted} style={styles.helper}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing[16],
  },
  container: {
    minHeight: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    borderRadius: radii[20],
    paddingHorizontal: spacing[16],
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  focused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.76)',
  },
  errorContainer: {
    borderColor: colors.error,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: colors.surface,
  },
  inputArea: {
    flex: 1,
    height: 54,
    justifyContent: 'center',
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    left: 0,
    top: 17,
    fontFamily: fonts.body.medium,
    fontSize: 15,
  },
  input: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text,
    paddingTop: 16,
    paddingBottom: 2,
    paddingHorizontal: 0,
    minHeight: 44, // 44px interactive target
  },
  leftIconContainer: {
    marginRight: spacing[8],
  },
  rightIconContainer: {
    marginLeft: spacing[8],
  },
  helper: {
    marginTop: spacing[4],
    marginLeft: spacing[4],
  },
});
