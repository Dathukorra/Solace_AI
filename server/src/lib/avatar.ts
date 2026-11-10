import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_DIR = path.resolve(process.cwd(), 'uploads', 'avatars');
const AVATAR_URL_PREFIX = '/uploads/avatars/';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function hasExpectedSignature(buffer: Buffer, mime: string): boolean {
  switch (mime) {
    case 'image/jpeg':
      return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/png':
      return (
        buffer.length > 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    case 'image/webp':
      return (
        buffer.length > 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    default:
      return false;
  }
}

/**
 * Accepts a base64 image data URL and stores it as a static avatar file.
 * Returns the public, relative URL persisted on the user record.
 */
export async function saveAvatarFromDataUrl(userId: string, dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error('Avatar must be a JPEG, PNG, or WebP image.');
  }

  const [, mime, base64] = match;
  const buffer = Buffer.from(base64, 'base64');

  if (buffer.length === 0) {
    throw new Error('Avatar image is empty.');
  }
  if (buffer.length > AVATAR_MAX_BYTES) {
    throw new Error('Avatar image must be 2 MB or smaller.');
  }
  if (!hasExpectedSignature(buffer, mime)) {
    throw new Error('Avatar file does not match a supported image format.');
  }

  await mkdir(AVATAR_DIR, { recursive: true });

  const extension = MIME_EXTENSIONS[mime];
  const filename = `${userId}-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
  await writeFile(path.join(AVATAR_DIR, filename), buffer);

  return `${AVATAR_URL_PREFIX}${filename}`;
}

/** Removes a stored avatar file, ignoring already-missing files. */
export async function removeAvatarFile(avatarUrl: string | null | undefined): Promise<void> {
  if (!avatarUrl || !avatarUrl.startsWith(AVATAR_URL_PREFIX)) return;

  const filename = path.basename(avatarUrl);
  await unlink(path.join(AVATAR_DIR, filename)).catch(() => {});
}
