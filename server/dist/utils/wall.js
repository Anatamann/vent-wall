import { WALL_VISIBILITY_HOURS } from '../constants.js';
export function getWallExpiresAt(from = new Date()) {
    return new Date(from.getTime() + WALL_VISIBILITY_HOURS * 60 * 60 * 1000);
}
export function isOnWall(expiresAt) {
    return new Date(expiresAt) >= new Date();
}
