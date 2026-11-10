import React from 'react';
import { Tabs } from 'expo-router';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Sola } from '../../components/Sola';
import { HintDot } from '../../components/HintDot';
import { useFeatureHint } from '../../features/onboarding/useFeatureHint';
import { useTourTarget } from '../../features/tour';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillFocused]}>
      <Text style={[styles.icon, focused && styles.focusedIcon]}>{icon}</Text>
    </View>
  );
}

function SolaTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.solaIconPill, focused && styles.solaIconPillFocused]}>
      <Sola mood={focused ? 'happy' : 'calm'} size={34} showGlow={false} />
    </View>
  );
}

interface TourTabButtonProps extends BottomTabBarButtonProps {
  targetId: string;
  hintId?: string;
}

/**
 * The tab bar's buttons double as tour targets. The ref is measured in window
 * space so the cutout lines up with the real tab button on every device.
 */
const TourTabButton: React.FC<TourTabButtonProps> = ({
  targetId,
  hintId,
  children,
  style,
  onPress,
  ...rest
}) => {
  const target = useTourTarget(targetId);
  const hint = useFeatureHint(hintId);

  return (
    <Pressable
      {...rest}
      ref={target.ref}
      onLayout={target.onLayout}
      onPress={(event) => {
        hint.dismiss();
        onPress?.(event);
      }}
      testID={targetId}
      collapsable={false}
      style={style}
    >
      {children}
      <HintDot visible={hint.visible} style={styles.tabHintDot} />
    </Pressable>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 74,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopWidth: 1.5,
          borderTopColor: colors.glassBorder,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          backgroundColor: 'rgba(255, 255, 255, 0.64)',
          overflow: 'hidden',
          shadowColor: 'rgba(139, 92, 246, 0.15)',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 1,
          shadowRadius: 20,
          elevation: 12,
        },
        tabBarBackground: () => (
          <BlurView intensity={38} tint="light" style={StyleSheet.absoluteFill}>
            <View style={styles.tabBarTint} />
          </BlurView>
        ),
        tabBarLabelStyle: {
          fontFamily: fonts.body.bold,
          fontSize: 11,
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
          tabBarButton: (props) => <TourTabButton {...props} targetId="tab-home" />,
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ({ focused }) => <TabIcon icon="🌿" focused={focused} />,
          tabBarButton: (props) => (
            <TourTabButton {...props} targetId="tab-activities" hintId="activities-tab" />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Sola',
          tabBarIcon: ({ focused }) => <SolaTabIcon focused={focused} />,
          tabBarButton: (props) => (
            <TourTabButton {...props} targetId="tab-sola" hintId="sola-tab" />
          ),
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
          tabBarButton: (props) => (
            <TourTabButton {...props} targetId="tab-insights" hintId="insights-tab" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
          tabBarButton: (props) => <TourTabButton {...props} targetId="tab-profile" />,
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  iconPill: {
    minWidth: 36,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillFocused: {
    backgroundColor: 'rgba(166, 61, 232, 0.12)',
  },
  icon: {
    fontSize: 19,
    opacity: 0.55,
  },
  focusedIcon: {
    opacity: 1,
    transform: [{ scale: 1.08 }],
  },
  solaIconPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243, 232, 251, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(199, 155, 232, 0.45)',
    shadowColor: 'rgba(139, 92, 246, 0.28)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  solaIconPillFocused: {
    backgroundColor: colors.primaryLight,
    borderColor: 'rgba(166, 61, 232, 0.5)',
    transform: [{ scale: 1.06 }],
  },
  tabHintDot: {
    position: 'absolute',
    top: 3,
    right: 14,
  },
});
