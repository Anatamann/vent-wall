import fs from 'fs/promises';
import path from 'path';
import { MAX_AVATAR_GIF_BYTES } from '../constants.js';
import { getKlipyGifById } from '../providers/klipy.js';
import { fetchAllowedGifBuffer, findKlipyCachedFilePath, MEDIA_ROOT, resolveMediaAbsolutePath, } from './media-assets.js';
export const AVATAR_DIR = path.join(MEDIA_ROOT, 'avatars');
export async function ensureAvatarDir() {
    await fs.mkdir(AVATAR_DIR, { recursive: true });
}
export function avatarRelativePath(userId) {
    return path.posix.join('avatars', `${userId}.gif`);
}
export function buildAvatarUrl(userId, avatarPath, avatarUpdatedAt) {
    if (!avatarPath)
        return null;
    const version = avatarUpdatedAt ? new Date(avatarUpdatedAt).getTime() : null;
    return version
        ? `/api/users/avatars/${userId}?v=${version}`
        : `/api/users/avatars/${userId}`;
}
export async function deleteUserAvatarFiles(userId) {
    for (const ext of ['.gif', '.webp']) {
        const absolute = path.join(AVATAR_DIR, `${userId}${ext}`);
        await fs.unlink(absolute).catch(() => undefined);
    }
}
export async function setUserAvatarFromKlipy(userId, gifId) {
    await ensureAvatarDir();
    let buffer = null;
    const cachedPath = await findKlipyCachedFilePath(gifId);
    if (cachedPath) {
        buffer = await fs.readFile(resolveMediaAbsolutePath(cachedPath));
        if (buffer.length > MAX_AVATAR_GIF_BYTES) {
            throw new AvatarProcessingError('GIF profile pictures must be under 2MB');
        }
    }
    else {
        const klipyGif = await getKlipyGifById(gifId);
        if (!klipyGif) {
            throw new AvatarProcessingError('GIF not found');
        }
        buffer = await fetchAllowedGifBuffer(klipyGif.gifUrl, MAX_AVATAR_GIF_BYTES);
    }
    await deleteUserAvatarFiles(userId);
    const relativePath = avatarRelativePath(userId);
    await fs.writeFile(resolveMediaAbsolutePath(relativePath), buffer);
    return {
        relativePath,
        mimeType: 'image/gif',
        klipyId: gifId,
    };
}
export class AvatarProcessingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AvatarProcessingError';
    }
}
