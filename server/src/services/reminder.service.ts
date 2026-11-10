import { ReminderType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export interface CreateReminderDto {
  userId: string;
  type: ReminderType;
  title: string;
  time: string; // HH:mm
  days: number[]; // 0..6
  enabled?: boolean;
}

export interface UpdateReminderDto {
  reminderId: string;
  userId: string;
  type?: ReminderType;
  title?: string;
  time?: string;
  days?: number[];
  enabled?: boolean;
}

export async function listUserReminders(userId: string) {
  const reminders = await prisma.reminder.findMany({
    where: { userId },
    orderBy: { time: 'asc' },
  });

  return reminders;
}

export async function createReminder(dto: CreateReminderDto) {
  const reminder = await prisma.reminder.create({
    data: {
      userId: dto.userId,
      type: dto.type,
      title: dto.title.trim(),
      time: dto.time.trim(),
      days: dto.days,
      enabled: dto.enabled ?? true,
    },
  });

  return reminder;
}

export async function getReminderById({
  reminderId,
  userId,
}: {
  reminderId: string;
  userId: string;
}) {
  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, userId },
  });

  if (!reminder) {
    throw new AppError('Reminder not found', 404);
  }

  return reminder;
}

export async function updateReminder(dto: UpdateReminderDto) {
  const existing = await prisma.reminder.findFirst({
    where: { id: dto.reminderId, userId: dto.userId },
  });

  if (!existing) {
    throw new AppError('Reminder not found', 404);
  }

  const updated = await prisma.reminder.update({
    where: { id: dto.reminderId },
    data: {
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.title !== undefined && { title: dto.title.trim() }),
      ...(dto.time !== undefined && { time: dto.time.trim() }),
      ...(dto.days !== undefined && { days: dto.days }),
      ...(dto.enabled !== undefined && { enabled: dto.enabled }),
    },
  });

  return updated;
}

export async function deleteReminder({
  reminderId,
  userId,
}: {
  reminderId: string;
  userId: string;
}) {
  const existing = await prisma.reminder.findFirst({
    where: { id: reminderId, userId },
  });

  if (!existing) {
    throw new AppError('Reminder not found', 404);
  }

  await prisma.reminder.delete({
    where: { id: reminderId },
  });

  return { success: true, message: 'Reminder deleted' };
}
