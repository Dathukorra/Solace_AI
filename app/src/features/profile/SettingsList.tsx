import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, Share, Linking, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/Toast';
import { authService } from '../auth/authService';
import { resetTourCompletion, useTour } from '../tour';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const SUPPORT_EMAIL = 'support@solaceai.app';

export const SettingsList: React.FC = () => {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { showToast } = useToast();
  const { start: startTour } = useTour();
  const insets = useSafeAreaInsets();

  const [activeModal, setActiveModal] = useState<'privacy' | 'about' | 'crisis' | 'howSola' | null>(
    null
  );

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await logout();
    router.replace('/(auth)/login');
  };

  const handleExportData = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const dateStr = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const summary = `🕊️ Solace AI Wellness Journal Summary
Date: ${dateStr}
Member: ${user?.name || 'Friend'} (${user?.email || 'N/A'})
Focus Areas: ${user?.goals?.join(', ') || 'General Wellness'}

"May you continue to breathe gently and honor every moment of your journey."
— Sola & Solace AI`;

    try {
      await Share.share({
        title: 'Solace AI Wellness Data',
        message: summary,
      });
      showToast({ message: 'Wellness summary ready to share ✨', variant: 'success' });
    } catch {
      showToast({ message: 'Export cancelled', variant: 'info' });
    }
  };

  const callHelpline = (number: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Linking.openURL(`tel:${number}`).catch(() => {
      showToast({ message: `Please dial ${number}`, variant: 'info' });
    });
  };

  const textHelpline = (number: string, body = 'HOME') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Linking.openURL(`sms:${number}?body=${body}`).catch(() => {
      showToast({ message: `Please text HOME to ${number}`, variant: 'info' });
    });
  };

  const handleReplayTour = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    if (!user?.id) return;
    await resetTourCompletion(user.id);
    updateUser({ hasSeenTour: false });

    try {
      const { user: updated } = await authService.updateProfile({ hasSeenTour: false });
      updateUser(updated);
    } catch {
      // The local reset is enough to replay now; the next sync can reconcile.
    }

    router.navigate('/(tabs)');
    showToast({ message: 'Replaying the tour ✨', variant: 'info' });
    setTimeout(() => startTour(), 350);
  };

  const handleContactSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const subject = encodeURIComponent('Solace AI support');
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => {
      showToast({ message: `Please email ${SUPPORT_EMAIL}`, variant: 'info' });
    });
  };

  return (
    <View style={styles.container}>
      <Text variant="title" style={styles.heading}>
        Mindful Settings & Care
      </Text>

      <Card variant="frosted" radius={28} shadow="sm" style={styles.card}>
        {/* Gentle Reminders */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            router.push('/reminders');
          }}
          accessibilityRole="button"
          accessibilityLabel="Gentle Reminders"
          style={({ pressed }) => [styles.item, styles.borderBottom, pressed && styles.pressed]}
        >
          <Text style={styles.icon}>🔔</Text>
          <View style={styles.itemTitle}>
            <Text variant="body" color={colors.text}>
              Gentle Reminders & Quiet Hours
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              Daily pauses, breathwork, quiet hours & offline alarms
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {/* Memories */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            router.push('/(tabs)/memories' as any);
          }}
          accessibilityRole="button"
          accessibilityLabel="What Sola Remembers"
          style={({ pressed }) => [styles.item, styles.borderBottom, pressed && styles.pressed]}
        >
          <Text style={styles.icon}>🧠</Text>
          <View style={styles.itemTitle}>
            <Text variant="body" color={colors.text}>
              What Sola Remembers
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              Review, edit, or clear AI context memory
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {/* Export Data */}
        <Pressable
          onPress={handleExportData}
          accessibilityRole="button"
          accessibilityLabel="Export Wellness Data"
          style={({ pressed }) => [styles.item, styles.borderBottom, pressed && styles.pressed]}
        >
          <Text style={styles.icon}>📊</Text>
          <View style={styles.itemTitle}>
            <Text variant="body" color={colors.text}>
              Export Wellness Data
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              Save or share your mindful progress summary
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {/* Privacy & Security */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setActiveModal('privacy');
          }}
          accessibilityRole="button"
          accessibilityLabel="Privacy and Security"
          style={({ pressed }) => [styles.item, styles.borderBottom, pressed && styles.pressed]}
        >
          <Text style={styles.icon}>🔒</Text>
          <View style={styles.itemTitle}>
            <Text variant="body" color={colors.text}>
              Privacy & Sanctuary
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              Zero ad tracking, encrypted memory sanctuary
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {/* Crisis Support */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setActiveModal('crisis');
          }}
          accessibilityRole="button"
          accessibilityLabel="Crisis Support Resources"
          style={({ pressed }) => [styles.item, styles.borderBottom, pressed && styles.pressed]}
        >
          <Text style={styles.icon}>❤️‍🩹</Text>
          <View style={styles.itemTitle}>
            <Text variant="body" color={colors.text}>
              Crisis & Support Resources
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              24/7 free, confidential professional lifelines
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {/* About Solace AI */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setActiveModal('about');
          }}
          accessibilityRole="button"
          accessibilityLabel="About Solace AI"
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          <Text style={styles.icon}>🕊️</Text>
          <View style={styles.itemTitle}>
            <Text variant="body" color={colors.text}>
              About Solace AI
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              Our calming mission & ethical principles
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </Card>

      <Text variant="title" style={[styles.heading, styles.helpHeading]}>
        Help
      </Text>

      <Card variant="frosted" radius={28} shadow="sm" style={styles.card}>
        <Pressable
          onPress={() => {
            void handleReplayTour();
          }}
          accessibilityRole="button"
          accessibilityLabel="Replay app tour"
          testID="profile-replay-tour"
          style={({ pressed }) => [styles.item, styles.borderBottom, pressed && styles.pressed]}
        >
          <Text style={styles.icon}>🔁</Text>
          <View style={styles.itemTitle}>
            <Text variant="body" color={colors.text}>
              Replay app tour
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              Walk through Sola's main features again
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setActiveModal('howSola');
          }}
          accessibilityRole="button"
          accessibilityLabel="How Sola works"
          testID="profile-how-sola-works"
          style={({ pressed }) => [styles.item, styles.borderBottom, pressed && styles.pressed]}
        >
          <Text style={styles.icon}>🕊️</Text>
          <View style={styles.itemTitle}>
            <Text variant="body" color={colors.text}>
              How Sola works
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              Chat, memory and privacy in three gentle points
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          onPress={handleContactSupport}
          accessibilityRole="button"
          accessibilityLabel="Contact support"
          testID="profile-contact-support"
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          <Text style={styles.icon}>✉️</Text>
          <View style={styles.itemTitle}>
            <Text variant="body" color={colors.text}>
              Contact support
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              We're here if something isn't working
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </Card>

      <Button
        title="Sign Out"
        variant="ghost"
        onPress={handleLogout}
        textStyle={{ color: colors.error }}
        style={styles.logoutBtn}
      />

      {/* Privacy Modal */}
      <Modal
        visible={activeModal === 'privacy'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <Card variant="surface" radius={28} shadow="lg" style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text variant="titleSm" style={{ marginBottom: spacing[8] }}>
                🔒 Privacy & Sanctuary
              </Text>
              <Text
                variant="body"
                color={colors.textSecondary}
                style={{ marginBottom: spacing[12], lineHeight: 22 }}
              >
                Your emotional sanctuary is sacred. Solace AI is designed with privacy at its heart:
              </Text>
              <View style={styles.bulletList}>
                <Text variant="bodySm" color={colors.text} style={styles.bulletItem}>
                  •{' '}
                  <Text variant="bodySm" style={{ fontWeight: '600' }}>
                    No Ad Tracking:
                  </Text>{' '}
                  We never monetize your personal emotions or sell your data.
                </Text>
                <Text variant="bodySm" color={colors.text} style={styles.bulletItem}>
                  •{' '}
                  <Text variant="bodySm" style={{ fontWeight: '600' }}>
                    Transparent Memory:
                  </Text>{' '}
                  You can view, delete individual items, or wipe everything Sola remembers at any
                  time.
                </Text>
                <Text variant="bodySm" color={colors.text} style={styles.bulletItem}>
                  •{' '}
                  <Text variant="bodySm" style={{ fontWeight: '600' }}>
                    Encrypted Transit:
                  </Text>{' '}
                  All communications between your device and Sola utilize secure TLS connections.
                </Text>
              </View>
              <Button
                title="Close"
                variant="secondary"
                onPress={() => setActiveModal(null)}
                style={{ marginTop: spacing[16] }}
              />
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Crisis Support Modal */}
      <Modal
        visible={activeModal === 'crisis'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <Card variant="surface" radius={28} shadow="lg" style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text variant="titleSm" style={{ marginBottom: spacing[8] }}>
                ❤️‍🩹 You Are Not Alone
              </Text>
              <Text
                variant="body"
                color={colors.textSecondary}
                style={{ marginBottom: spacing[16], lineHeight: 22 }}
              >
                If you are feeling overwhelmed, hopeless, or having thoughts of self-harm, please
                reach out to compassionate humans ready to listen:
              </Text>

              <Card variant="frosted" radius={20} shadow="sm" style={styles.crisisCard}>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                  988 Suicide & Crisis Lifeline
                </Text>
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={{ marginBottom: spacing[8] }}
                >
                  Available 24/7 in English & Spanish across the US and Canada.
                </Text>
                <Button
                  title="Call 988"
                  variant="primary"
                  size="sm"
                  onPress={() => callHelpline('988')}
                />
              </Card>

              <Card variant="frosted" radius={20} shadow="sm" style={styles.crisisCard}>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                  Crisis Text Line
                </Text>
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={{ marginBottom: spacing[8] }}
                >
                  Free, confidential 24/7 text support with trained crisis counselors.
                </Text>
                <Button
                  title="Text HOME to 741741"
                  variant="secondary"
                  size="sm"
                  onPress={() => textHelpline('741741', 'HOME')}
                />
              </Card>

              <Card variant="frosted" radius={20} shadow="sm" style={styles.crisisCard}>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                  The Trevor Project
                </Text>
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={{ marginBottom: spacing[8] }}
                >
                  24/7 crisis support for LGBTQ+ young people.
                </Text>
                <Button
                  title="Call 1-866-488-7386"
                  variant="ghost"
                  size="sm"
                  onPress={() => callHelpline('18664887386')}
                />
              </Card>

              <Button
                title="Return to App"
                variant="ghost"
                onPress={() => setActiveModal(null)}
                style={{ marginTop: spacing[12] }}
              />
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal
        visible={activeModal === 'about'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <Card variant="surface" radius={28} shadow="lg" style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.aboutEmoji}>🕊️</Text>
              <Text variant="title" style={{ textAlign: 'center', marginBottom: spacing[4] }}>
                Solace AI
              </Text>
              <Text
                variant="caption"
                color={colors.textSecondary}
                style={{ textAlign: 'center', marginBottom: spacing[16] }}
              >
                Version 1.0.0 • A calmer you, one breath at a time
              </Text>
              <Text
                variant="body"
                color={colors.textSecondary}
                style={{ lineHeight: 22, marginBottom: spacing[12] }}
              >
                Solace AI is designed as a peaceful sanctuary for your daily thoughts, reflections,
                and mindful pauses. With our mascot Sola, we bring warm, non-judgmental
                companionship whenever you need grounding.
              </Text>
              <Card
                variant="frosted"
                radius={20}
                shadow="sm"
                style={{ padding: spacing[12], marginBottom: spacing[16] }}
              >
                <Text variant="caption" color={colors.textMuted} style={{ lineHeight: 18 }}>
                  Note: Solace AI is a supportive wellness tool and companion. It does not provide
                  medical diagnosis, therapy, or clinical psychiatric treatment.
                </Text>
              </Card>
              <Button title="Close" variant="secondary" onPress={() => setActiveModal(null)} />
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* How Sola Works Bottom Sheet */}
      <Modal
        visible={activeModal === 'howSola'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setActiveModal(null)}
            accessibilityRole="button"
            accessibilityLabel="Close how Sola works"
          />
          <View
            style={[
              styles.howSheet,
              { paddingBottom: Math.max(insets.bottom, spacing[16]) + spacing.md },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text variant="title" style={styles.sheetTitle}>
              How Sola works
            </Text>

            <View style={styles.sheetBullets}>
              <View style={styles.sheetBulletRow}>
                <Text style={styles.sheetBulletIcon}>💬</Text>
                <Text variant="bodySm" color={colors.textSecondary} style={styles.sheetBulletText}>
                  <Text variant="bodyMedium" color={colors.text}>
                    Chat, your way.{' '}
                  </Text>
                  Tell Sola what's on your mind. It responds with warmth, reflection and small
                  calming practices.
                </Text>
              </View>

              <View style={styles.sheetBulletRow}>
                <Text style={styles.sheetBulletIcon}>🧠</Text>
                <Text variant="bodySm" color={colors.textSecondary} style={styles.sheetBulletText}>
                  <Text variant="bodyMedium" color={colors.text}>
                    Memory, your choice.{' '}
                  </Text>
                  Sola remembers only what helps personalize your care. Review or delete any memory
                  anytime.
                </Text>
              </View>

              <View style={styles.sheetBulletRow}>
                <Text style={styles.sheetBulletIcon}>🔒</Text>
                <Text variant="bodySm" color={colors.textSecondary} style={styles.sheetBulletText}>
                  <Text variant="bodyMedium" color={colors.text}>
                    Private by design.{' '}
                  </Text>
                  No ad tracking and no selling your data. Your conversations and feelings stay
                  yours.
                </Text>
              </View>
            </View>

            <Button
              title="Close"
              variant="secondary"
              onPress={() => setActiveModal(null)}
              style={styles.sheetClose}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[12],
  },
  heading: {
    marginBottom: spacing[8],
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  icon: {
    fontSize: 22,
    marginRight: spacing[12],
  },
  itemTitle: {
    flex: 1,
  },
  chevron: {
    fontSize: 20,
    color: colors.textMuted,
  },
  logoutBtn: {
    marginTop: spacing[24],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.32)',
    justifyContent: 'center',
    padding: spacing[16],
  },
  modalCard: {
    maxHeight: '85%',
    padding: spacing[16],
  },
  bulletList: {
    gap: spacing[8],
  },
  bulletItem: {
    lineHeight: 20,
  },
  crisisCard: {
    marginBottom: spacing[12],
    padding: spacing[12],
  },
  aboutEmoji: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  helpHeading: {
    marginTop: spacing[24],
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(30, 27, 46, 0.34)',
  },
  howSheet: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing[24],
    paddingTop: spacing[12],
    shadowColor: 'rgba(30, 27, 46, 0.22)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 18,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(107, 100, 120, 0.24)',
    marginBottom: spacing[16],
  },
  sheetTitle: {
    marginBottom: spacing[16],
  },
  sheetBullets: {
    gap: spacing[16],
    marginBottom: spacing[24],
  },
  sheetBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
  },
  sheetBulletIcon: {
    fontSize: 22,
    marginTop: 1,
  },
  sheetBulletText: {
    flex: 1,
    lineHeight: 21,
  },
  sheetClose: {
    width: '100%',
  },
});
