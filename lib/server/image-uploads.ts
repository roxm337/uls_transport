import { randomUUID } from 'node:crypto';

/** Client logos and similar internal artwork. */
export const MAX_IMAGE_UPLOAD_SIZE = 10 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
};

export const IMAGE_OBJECT_PREFIX = 'uploads/';

export function isUploadableImageType(value: unknown): value is string {
    return typeof value === 'string' && value in EXTENSION_BY_TYPE;
}

export function validateImageUpload(
    contentType: unknown,
    size: unknown,
): { ok: true; mimeType: string } | { ok: false; error: string } {
    if (!isUploadableImageType(contentType)) {
        return { ok: false, error: 'Invalid file type. Only images are allowed.' };
    }
    const bytes = typeof size === 'number' ? size : Number(size);
    if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_IMAGE_UPLOAD_SIZE) {
        return { ok: false, error: 'File size exceeds 10MB limit' };
    }
    return { ok: true, mimeType: contentType };
}

/**
 * Named by us, never derived from what the client sent: the extension comes
 * from the validated type, so nothing a caller supplies can shape the key or
 * the content type it is later served under.
 */
export function newImageObjectKey(mimeType: string): string {
    return `${IMAGE_OBJECT_PREFIX}${randomUUID()}.${EXTENSION_BY_TYPE[mimeType]}`;
}

/** The app-facing URL for a stored image, served back through an authed route. */
export function imageUrlForKey(key: string): string {
    return `/api/uploads/${key.slice(IMAGE_OBJECT_PREFIX.length)}`;
}

export function imageKeyForPath(path: string): string {
    return `${IMAGE_OBJECT_PREFIX}${path}`;
}

export function imageContentType(key: string): string {
    const extension = key.split('.').pop()?.toLowerCase() ?? '';
    const found = Object.entries(EXTENSION_BY_TYPE).find(([, ext]) => ext === extension);
    return found ? found[0] : 'application/octet-stream';
}
