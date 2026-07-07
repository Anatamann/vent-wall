import { buildAvatarUrl } from './avatar-assets.js';
export function enrichUser(user) {
    const { avatar_path, avatar_mime_type, avatar_updated_at, ...rest } = user;
    return {
        ...rest,
        avatar_url: buildAvatarUrl(user.id, avatar_path, avatar_updated_at),
        avatar_mime_type: avatar_path ? avatar_mime_type ?? null : null,
    };
}
export const USER_PUBLIC_FIELDS = `
  id, username, email, created_at, last_post_date, post_count_today,
  avatar_path, avatar_mime_type, avatar_updated_at
`;
