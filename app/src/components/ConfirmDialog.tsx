import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import { Button } from './Button';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Keep editing',
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.overlay}>
      <Card variant="surface" radius={28} shadow="lg" style={styles.card}>
        <Text variant="titleSm" style={styles.title}>
          {title}
        </Text>
        <Text variant="bodySm" color={colors.textSecondary} style={styles.message}>
          {message}
        </Text>
        <View style={styles.actions}>
          <Button
            title={cancelLabel}
            variant="ghost"
            onPress={onCancel}
            disabled={loading}
            style={styles.action}
          />
          <Button
            title={confirmLabel}
            variant="primary"
            onPress={onConfirm}
            loading={loading}
            style={styles.action}
          />
        </View>
      </Card>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.32)',
    justifyContent: 'center',
    padding: spacing[16],
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    padding: spacing[24],
  },
  title: {
    color: colors.text,
    marginBottom: spacing[8],
  },
  message: {
    lineHeight: 21,
    marginBottom: spacing[24],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  action: {
    flex: 1,
  },
});
