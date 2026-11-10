import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { GlassCard } from '../../components/GlassCard';
import { GradientButton } from '../../components/GradientButton';
import { Sola } from '../../components/Sola';
import { Text } from '../../components/Text';
import { colors } from '../../theme/colors';
import { useTour } from './TourContext';

const AnimatedRect = Animated.createAnimatedComponent(Rect) as React.ComponentType<any>;

const OVERLAY_COLOR = 'rgba(30, 27, 46, 0.65)';
const CUTOUT_PADDING = 8;
const CUTOUT_RADIUS = 24;
const TOOLTIP_GAP = 14;
const SCREEN_MARGIN = 16;
const MAX_TOOLTIP_WIDTH = 420;

const CUTOUT_SPRING = { damping: 20, stiffness: 180, mass: 0.9 };
const GLOW_EDGE = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export const TourOverlay: React.FC = () => {
  const {
    steps,
    currentStep,
    isActive,
    isTargetReady,
    targetRects,
    next,
    skip,
    finish,
    measureCurrentTarget,
  } = useTour();

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = height < 700 || width < 360;

  const [displayedStep, setDisplayedStep] = useState(currentStep);
  const [tooltipHeight, setTooltipHeight] = useState(0);

  const overlayOpacity = useSharedValue(0);
  const tooltipOpacity = useSharedValue(0);
  const glow = useSharedValue(0.5);

  const cutoutX = useSharedValue(0);
  const cutoutY = useSharedValue(0);
  const cutoutW = useSharedValue(0);
  const cutoutH = useSharedValue(0);
  const cutoutR = useSharedValue(CUTOUT_RADIUS);
  const cutoutOpacity = useSharedValue(0);
  const hasPositionedRef = useRef(false);

  const maskId = `tour-cutout-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const activeStep = steps[currentStep];
  const visibleStep = steps[displayedStep] ?? activeStep;

  const cutout = useMemo(() => {
    const step = steps[currentStep];
    if (!step || !isTargetReady) return null;

    const rect = targetRects[step.targetId];
    if (!rect) return null;

    const padding = step.padding ?? CUTOUT_PADDING;
    const left = clamp(rect.x - padding, 0, width);
    const top = clamp(rect.y - padding, 0, height);
    const right = clamp(rect.x + rect.width + padding, 0, width);
    const bottom = clamp(rect.y + rect.height + padding, 0, height);

    return {
      x: left,
      y: top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
      radius: step.radius ?? CUTOUT_RADIUS,
    };
  }, [currentStep, height, isTargetReady, steps, targetRects, width]);

  const cutoutProps = useAnimatedProps(() => ({
    x: cutoutX.value,
    y: cutoutY.value,
    width: cutoutW.value,
    height: cutoutH.value,
    rx: cutoutR.value,
    opacity: cutoutOpacity.value,
  }));

  const glowOuterProps = useAnimatedProps(() => ({
    x: cutoutX.value - GLOW_EDGE / 2,
    y: cutoutY.value - GLOW_EDGE / 2,
    width: cutoutW.value + GLOW_EDGE,
    height: cutoutH.value + GLOW_EDGE,
    rx: cutoutR.value + GLOW_EDGE / 2,
    strokeOpacity: glow.value * 0.22,
  }));

  const glowInnerProps = useAnimatedProps(() => ({
    x: cutoutX.value - 2,
    y: cutoutY.value - 2,
    width: cutoutW.value + 4,
    height: cutoutH.value + 4,
    rx: cutoutR.value + 2,
    strokeOpacity: glow.value * 0.8,
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const tooltipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
  }));

  // Fade the dim layer in and start the soft breathing glow.
  useEffect(() => {
    if (isActive) {
      overlayOpacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.quad),
      });
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.32, { duration: 1300, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    } else {
      overlayOpacity.value = withTiming(0, { duration: 150 });
      cancelAnimation(glow);
      glow.value = 0.5;
      cutoutOpacity.value = 0;
      hasPositionedRef.current = false;
      setDisplayedStep(0);
      setTooltipHeight(0);
    }

    return () => {
      cancelAnimation(glow);
    };
  }, [cutoutOpacity, glow, isActive, overlayOpacity]);

  // Snap the cutout into place for the first step, then spring between steps.
  // Subsequent measurements (scroll, keyboard, rotation) spring as well so the
  // hole follows the target instead of teleporting.
  useEffect(() => {
    if (!isActive || !cutout) return;

    if (!hasPositionedRef.current) {
      hasPositionedRef.current = true;
      cutoutX.value = cutout.x;
      cutoutY.value = cutout.y;
      cutoutW.value = cutout.width;
      cutoutH.value = cutout.height;
      cutoutR.value = cutout.radius;
      cutoutOpacity.value = withTiming(1, { duration: 220 });
      return;
    }

    cutoutX.value = withSpring(cutout.x, CUTOUT_SPRING);
    cutoutY.value = withSpring(cutout.y, CUTOUT_SPRING);
    cutoutW.value = withSpring(cutout.width, CUTOUT_SPRING);
    cutoutH.value = withSpring(cutout.height, CUTOUT_SPRING);
    cutoutR.value = withSpring(cutout.radius, CUTOUT_SPRING);
  }, [cutout, cutoutH, cutoutOpacity, cutoutR, cutoutW, cutoutX, cutoutY, isActive]);

  // Cross-fade the tooltip copy between steps, and keep it hidden until the
  // new target has been measured.
  useEffect(() => {
    if (!isActive || !isTargetReady) {
      tooltipOpacity.value = 0;
      return;
    }

    if (currentStep === displayedStep) {
      tooltipOpacity.value = withTiming(1, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    tooltipOpacity.value = withTiming(
      0,
      { duration: 130, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) {
          runOnJS(setDisplayedStep)(currentStep);
        }
      }
    );
  }, [currentStep, displayedStep, isActive, isTargetReady, tooltipOpacity]);

  // Android hardware back skips the tour.
  useEffect(() => {
    if (!isActive) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      skip();
      return true;
    });

    return () => subscription.remove();
  }, [isActive, skip]);

  useEffect(() => {
    if (!isActive || !visibleStep) return;
    AccessibilityInfo.announceForAccessibility(`${visibleStep.title}. ${visibleStep.description}`);
  }, [isActive, visibleStep]);

  const tooltipWidth = Math.min(width - SCREEN_MARGIN * 2, MAX_TOOLTIP_WIDTH);
  const estimatedTooltipHeight = isCompact ? 198 : 220;
  const resolvedTooltipHeight = tooltipHeight || estimatedTooltipHeight;
  const topLimit = insets.top + 8;
  const bottomLimit = height - insets.bottom - 8;

  let tooltipTop = clamp(
    (height - resolvedTooltipHeight) / 2,
    topLimit,
    bottomLimit - resolvedTooltipHeight
  );
  if (cutout) {
    const spaceAbove = cutout.y - TOOLTIP_GAP - topLimit;
    const spaceBelow = bottomLimit - (cutout.y + cutout.height + TOOLTIP_GAP);
    const placeAbove = spaceAbove >= resolvedTooltipHeight || spaceAbove > spaceBelow;

    tooltipTop = placeAbove
      ? cutout.y - TOOLTIP_GAP - resolvedTooltipHeight
      : cutout.y + cutout.height + TOOLTIP_GAP;

    tooltipTop = clamp(tooltipTop, topLimit, bottomLimit - resolvedTooltipHeight);
  }

  const tooltipLeft = cutout
    ? clamp(
        cutout.x + cutout.width / 2 - tooltipWidth / 2,
        SCREEN_MARGIN,
        width - tooltipWidth - SCREEN_MARGIN
      )
    : (width - tooltipWidth) / 2;

  const isLastStep = currentStep >= steps.length - 1;

  const handlePrimaryAction = () => {
    if (currentStep >= steps.length - 1) {
      finish();
    } else {
      next();
    }
  };

  return (
    <Modal
      visible={isActive}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={skip}
      onShow={measureCurrentTarget}
    >
      <View style={styles.root} accessibilityViewIsModal>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, overlayAnimatedStyle]}>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <Mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />
                {cutout && <AnimatedRect animatedProps={cutoutProps} fill="#000000" />}
              </Mask>
            </Defs>

            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill={OVERLAY_COLOR}
              mask={`url(#${maskId})`}
            />

            {cutout && (
              <>
                <AnimatedRect
                  animatedProps={glowOuterProps}
                  fill="none"
                  stroke={colors.secondary}
                  strokeWidth={GLOW_EDGE}
                  strokeLinejoin="round"
                />
                <AnimatedRect
                  animatedProps={glowInnerProps}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              </>
            )}
          </Svg>
        </Animated.View>

        {isTargetReady && cutout && visibleStep && (
          <Animated.View
            style={[
              styles.tooltip,
              {
                left: tooltipLeft,
                top: tooltipTop,
                width: tooltipWidth,
              },
              tooltipAnimatedStyle,
            ]}
            onLayout={(event) => setTooltipHeight(event.nativeEvent.layout.height)}
          >
            <GlassCard
              variant="solid"
              radius={isCompact ? 22 : 26}
              shadow="lg"
              blurIntensity={18}
              style={[styles.tooltipCard, isCompact && styles.tooltipCardCompact]}
            >
              <View style={styles.headerRow}>
                <View style={[styles.avatar, isCompact && styles.avatarCompact]}>
                  <Sola size={isCompact ? 32 : 40} mood="happy" showGlow={false} />
                </View>

                <View style={styles.titleGroup}>
                  <Text variant="titleSm" style={styles.title} numberOfLines={2}>
                    {visibleStep.title}
                  </Text>
                  <Text variant="caption" color={colors.textMuted}>
                    {displayedStep + 1} of {steps.length}
                  </Text>
                </View>
              </View>

              <Text
                variant="bodySm"
                color={colors.textSecondary}
                style={styles.description}
                numberOfLines={3}
              >
                {visibleStep.description}
              </Text>

              <View style={styles.dotsRow}>
                {steps.map((step, index) => (
                  <View
                    key={step.id}
                    style={[styles.dot, index === displayedStep && styles.dotActive]}
                  />
                ))}
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={skip}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Skip tour"
                  style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
                >
                  <Text variant="bodyMedium" color={colors.textMuted}>
                    Skip
                  </Text>
                </Pressable>

                <GradientButton
                  title={isLastStep ? 'Got it' : 'Next'}
                  onPress={handlePrimaryAction}
                  fullWidth={false}
                  hapticFeedback={false}
                  accessibilityLabel={isLastStep ? 'Finish tour' : 'Next tour step'}
                  style={[styles.nextButton, isCompact && styles.nextButtonCompact]}
                  textStyle={isCompact ? styles.nextButtonTextCompact : undefined}
                />
              </View>
            </GlassCard>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tooltip: {
    position: 'absolute',
  },
  tooltipCard: {
    padding: 18,
  },
  tooltipCardCompact: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243, 232, 251, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(199, 155, 232, 0.45)',
    overflow: 'hidden',
  },
  avatarCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
  },
  description: {
    marginTop: 10,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(166, 61, 232, 0.2)',
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  skipButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.55,
  },
  nextButton: {
    minWidth: 122,
    height: 50,
  },
  nextButtonCompact: {
    minWidth: 108,
    height: 44,
  },
  nextButtonTextCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
});
