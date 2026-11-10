import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import * as ReminderService from '../services/reminder.service';

function getUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

function getReminderId(req: Request): string {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    throw new AppError('Reminder ID is required', 400);
  }
  return id;
}

export async function listRemindersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const reminders = await ReminderService.listUserReminders(userId);
    res.status(200).json({ items: reminders });
  } catch (error) {
    next(error);
  }
}

export async function createReminderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const { type, title, time, days, enabled } = req.body;

    const reminder = await ReminderService.createReminder({
      userId,
      type,
      title,
      time,
      days,
      enabled,
    });

    res.status(201).json({ reminder });
  } catch (error) {
    next(error);
  }
}

export async function getReminderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const reminderId = getReminderId(req);

    const reminder = await ReminderService.getReminderById({
      reminderId,
      userId,
    });

    res.status(200).json({ reminder });
  } catch (error) {
    next(error);
  }
}

export async function updateReminderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const reminderId = getReminderId(req);
    const { type, title, time, days, enabled } = req.body;

    const reminder = await ReminderService.updateReminder({
      reminderId,
      userId,
      type,
      title,
      time,
      days,
      enabled,
    });

    res.status(200).json({ reminder });
  } catch (error) {
    next(error);
  }
}

export async function deleteReminderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const reminderId = getReminderId(req);

    const result = await ReminderService.deleteReminder({
      reminderId,
      userId,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
