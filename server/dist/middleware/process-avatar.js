import multer from 'multer';
import { MAX_AVATAR_GIF_BYTES, MAX_AVATAR_IMAGE_BYTES } from '../constants.js';
import { AvatarProcessingError, processAvatarBuffer, } from '../utils/avatar-assets.js';
const ALLOWED_MIME_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
]);
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_AVATAR_IMAGE_BYTES,
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(new AvatarProcessingError('Only PNG, JPG, JPEG, WEBP, and GIF files are allowed'));
            return;
        }
        cb(null, true);
    },
});
export const receiveAvatarUpload = upload.single('avatar');
export async function processAvatarUpload(req, res, next) {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No image file provided. Use field name "avatar".' });
            return;
        }
        if (req.file.mimetype === 'image/gif' && req.file.size > MAX_AVATAR_GIF_BYTES) {
            res.status(400).json({ error: 'GIF profile pictures must be under 2MB' });
            return;
        }
        req.processedAvatar = await processAvatarBuffer(req.file.buffer, req.file.originalname);
        next();
    }
    catch (err) {
        if (err instanceof AvatarProcessingError) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (err instanceof multer.MulterError) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? 'File is too large'
                : err.message;
            res.status(400).json({ error: message });
            return;
        }
        next(err);
    }
}
