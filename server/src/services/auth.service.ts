import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { signAccessToken, signRefreshToken, verifyRefreshToken, JwtPayload } from '../lib/jwt';
import { removeAvatarFile, saveAvatarFromDataUrl } from '../lib/avatar';
import { calculateAge, Gender, parseDateOnly } from '../lib/profile';

const BCRYPT_ROUNDS = 12;
/** Access token lifetime in seconds (15 min) */
const ACCESS_EXPIRES_IN = 900;
const PASSWORD_RESET_TTL_MS = env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000;

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface SignupDto {
  name: string;
  email: string;
  password: string;
  goals: string[];
  timezone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface UpdateMeDto {
  name?: string;
  email?: string;
  goals?: string[];
  timezone?: string;
  aiMemoryEnabled?: boolean;
  hasSeenTour?: boolean;
  age?: number | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  phoneNumber?: string | null;
  location?: string | null;
  /** Base64 image data URL. Omit to keep the current picture, null to remove it. */
  avatar?: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateTokenPair(user: { id: string; email: string; name: string }): TokenPair {
  const payload: JwtPayload = { sub: user.id, email: user.email, name: user.name };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    expiresIn: ACCESS_EXPIRES_IN,
  };
}

type SafeUser = Omit<User, 'passwordHash' | 'dateOfBirth'> & { dateOfBirth: string | null };

function safeUser(user: User): SafeUser {
  const { passwordHash: _pw, dateOfBirth, ...rest } = user;
  void _pw;
  return {
    ...rest,
    dateOfBirth: dateOfBirth ? dateOfBirth.toISOString().slice(0, 10) : null,
  };
}

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function buildResetUrl(token: string): string {
  const separator = env.PASSWORD_RESET_URL_BASE.includes('?') ? '&' : '?';
  return `${env.PASSWORD_RESET_URL_BASE}${separator}token=${encodeURIComponent(token)}`;
}

// ─── Service methods ──────────────────────────────────────────────────────────

export async function signup(dto: SignupDto) {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } });
  if (existing) {
    throw new AppError('An account with that email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

  // Seed sensible default reminders (disabled until the user opts in)
  const defaultReminders = [
    {
      type: 'AFFIRMATION' as const,
      title: 'Morning Affirmation',
      time: '08:30',
      days: [0, 1, 2, 3, 4, 5, 6],
      enabled: false,
    },
    {
      type: 'MOOD' as const,
      title: 'Midday Mood Check-in',
      time: '13:00',
      days: [0, 1, 2, 3, 4, 5, 6],
      enabled: false,
    },
    {
      type: 'SELFCARE' as const,
      title: 'Afternoon Mindful Pause',
      time: '17:00',
      days: [1, 2, 3, 4, 5],
      enabled: false,
    },
    {
      type: 'BREATHING' as const,
      title: 'Evening Breathwork & Wind Down',
      time: '21:30',
      days: [0, 1, 2, 3, 4, 5, 6],
      enabled: false,
    },
  ];

  const user = await prisma.user.create({
    data: {
      name: dto.name,
      email: dto.email,
      passwordHash,
      goals: dto.goals,
      timezone: dto.timezone ?? 'UTC',
      reminders: {
        create: defaultReminders,
      },
    },
  });

  const tokens = generateTokenPair(user);
  return { user: safeUser(user), ...tokens };
}

export async function login(dto: LoginDto) {
  // Use same error message for both "not found" and "wrong password" to prevent user enumeration
  const invalid = new AppError('Invalid email or password', 401);

  const user = await prisma.user.findUnique({ where: { email: dto.email } });
  if (!user) throw invalid;

  const match = await bcrypt.compare(dto.password, user.passwordHash);
  if (!match) throw invalid;

  const tokens = generateTokenPair(user);
  return { user: safeUser(user), ...tokens };
}

/**
 * Creates a single-use password reset token.
 *
 * The response is deliberately identical for known and unknown emails to avoid
 * account enumeration. In non-production environments the token is also
 * returned so the app can complete the demo flow without an email provider.
 */
export async function requestPasswordReset(dto: ForgotPasswordDto) {
  const email = dto.email.trim();
  const message = 'If an account exists for that email, password reset instructions are ready.';
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { message };
  }

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  // A new request invalidates any previous reset tokens for this user.
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    }),
  ]);

  logger.info(`Password reset requested for user ${user.id}`);

  if (env.NODE_ENV !== 'production') {
    return {
      message,
      resetToken: token,
      resetUrl: buildResetUrl(token),
      expiresInMinutes: env.PASSWORD_RESET_TTL_MINUTES,
    };
  }

  return { message };
}

/**
 * Completes a password reset using a valid single-use token.
 * All outstanding reset tokens for the user are invalidated on success.
 */
export async function resetPassword(dto: ResetPasswordDto) {
  const invalid = new AppError(
    'This reset link is invalid or has expired. Please request a new one.',
    400
  );

  const tokenHash = hashResetToken(dto.token.trim());
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!record) throw invalid;

  if (record.expiresAt.getTime() <= Date.now()) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => {});
    throw invalid;
  }

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

  // Claim the token inside a transaction so it can only be used once, even if
  // two reset requests arrive at the same time.
  const claimed = await prisma.$transaction(async (tx) => {
    const deleted = await tx.passwordResetToken.deleteMany({
      where: { id: record.id, expiresAt: { gt: new Date() } },
    });

    if (deleted.count !== 1) return false;

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await tx.passwordResetToken.deleteMany({ where: { userId: record.userId } });
    return true;
  });

  if (!claimed) throw invalid;

  logger.info(`Password reset completed for user ${record.userId}`);

  return {
    message: 'Your password has been updated. You can sign in with your new password.',
    email: record.user.email,
  };
}

export async function refresh(refreshToken: string) {
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new AppError('User not found', 401);

  const accessToken = signAccessToken({ sub: user.id, email: user.email, name: user.name });
  return { accessToken, expiresIn: ACCESS_EXPIRES_IN };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return safeUser(user);
}

export async function updateMe(userId: string, dto: UpdateMeDto) {
  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) throw new AppError('User not found', 404);

  if (dto.email && dto.email !== current.email) {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new AppError('That email is already in use', 409);
  }

  let avatarUrlUpdate: string | null | undefined;
  if (dto.avatar !== undefined) {
    if (dto.avatar === null) {
      avatarUrlUpdate = null;
    } else {
      try {
        avatarUrlUpdate = await saveAvatarFromDataUrl(userId, dto.avatar);
      } catch (error) {
        throw new AppError(error instanceof Error ? error.message : 'Invalid profile picture', 400);
      }
    }
  }

  const dateOfBirthUpdate =
    dto.dateOfBirth === undefined
      ? undefined
      : dto.dateOfBirth === null
        ? null
        : parseDateOnly(dto.dateOfBirth);

  // If a birthday is supplied without an age, derive the age automatically.
  let ageUpdate = dto.age === undefined ? undefined : dto.age;
  if (ageUpdate === undefined && dateOfBirthUpdate) {
    ageUpdate = calculateAge(dateOfBirthUpdate);
  }

  let user: User;
  try {
    user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.email !== undefined && { email: dto.email.trim() }),
        ...(dto.goals !== undefined && { goals: dto.goals }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.aiMemoryEnabled !== undefined && { aiMemoryEnabled: dto.aiMemoryEnabled }),
        ...(dto.hasSeenTour !== undefined && { hasSeenTour: dto.hasSeenTour }),
        ...(ageUpdate !== undefined && { age: ageUpdate }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dateOfBirthUpdate !== undefined && { dateOfBirth: dateOfBirthUpdate }),
        ...(dto.phoneNumber !== undefined && {
          phoneNumber: dto.phoneNumber === null ? null : dto.phoneNumber.trim(),
        }),
        ...(dto.location !== undefined && {
          location: dto.location === null ? null : dto.location.trim(),
        }),
        ...(avatarUrlUpdate !== undefined && { avatarUrl: avatarUrlUpdate }),
      },
    });
  } catch (error) {
    // Do not leave an orphaned image behind when the database write fails.
    if (avatarUrlUpdate) await removeAvatarFile(avatarUrlUpdate);

    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      throw new AppError('That email is already in use', 409);
    }
    throw error;
  }

  if (avatarUrlUpdate !== undefined && current.avatarUrl && current.avatarUrl !== avatarUrlUpdate) {
    await removeAvatarFile(current.avatarUrl);
  }

  return safeUser(user);
}
