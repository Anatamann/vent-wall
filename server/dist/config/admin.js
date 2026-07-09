import { isPublicId } from '../utils/ids.js';
let cachedAdminIds = null;
function parseAdminUserIds() {
    const raw = process.env.ADMIN_USER_IDS || '';
    const ids = raw
        .split(',')
        .map((part) => part.trim())
        .filter((part) => isPublicId(part));
    return new Set(ids);
}
export function getAdminUserIds() {
    if (!cachedAdminIds) {
        cachedAdminIds = parseAdminUserIds();
    }
    return cachedAdminIds;
}
export function isAdminUser(userId) {
    return getAdminUserIds().has(userId);
}
