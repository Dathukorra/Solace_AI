import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Header';
import { ProfileHeader } from '../../features/profile/ProfileHeader';
import { ReminderList } from '../../features/reminders/ReminderList';
import { SettingsList } from '../../features/profile/SettingsList';
import { spacing } from '../../theme/spacing';

export default function ProfileScreen() {
  return (
    <Screen scrollable contentContainerStyle={styles.scrollContent}>
      <Header title="Your Profile" subtitle="Settings & mindful journey" />
      <ProfileHeader />
      <ReminderList />
      <SettingsList />
      <View style={{ height: spacing[32] }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing[16],
  },
});
