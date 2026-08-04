import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Object storage for uploaded files, backed by Cloudflare R2.
 *
 * Vercel caps a serverless function's request body at 4.5 MB, so a document can
 * never travel through our own API on the way in — the browser uploads straight
 * to R2 against a presigned URL, and we only issue the grant and record the row.
 * Downloads still stream back through our routes, because that is where the
 * ownership checks live.
 *
 * With no R2 credentials configured the whole thing falls back to the local disk
 * and a signed same-origin upload URL, so `pnpm dev` works against nothing.
 */

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET;

export type StorageDriver = 'r2' | 'local';

export function storageDriver(): StorageDriver {
    return ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET ? 'r2' : 'local';
}

let client: S3Client | null = null;

function s3(): S3Client {
    if (!client) {
        client = new S3Client({
            // Not optional: the SDK refuses to sign without a region, and R2
            // accepts only this placeholder.
            region: 'auto',
            endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId: ACCESS_KEY_ID!, secretAccessKey: SECRET_ACCESS_KEY! },
        });
    }
    return client;
}

/**
 * Object keys are built by us, never by a caller, but they end up in a
 * filesystem path under the local driver — so they are checked anyway.
 */
export function isSafeKey(key: string): boolean {
    return (
        key.length > 0 &&
        key.length <= 1024 &&
        !key.startsWith('/') &&
        !key.includes('..') &&
        !key.includes('\0') &&
        /^[A-Za-z0-9._/-]+$/.test(key)
    );
}

function localPath(key: string): string {
    return join(process.cwd(), 'storage', key);
}

// ── Local-driver upload grants ────────────────────────────────────────────
//
// The local driver has no presigning, so it mints an HMAC over the key, the
// content type and an expiry. Without it the dev-only upload endpoint would
// accept a write to any key from any signed-in user.

function uploadSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is required to sign local upload URLs');
    return secret;
}

export function signLocalUpload(key: string, contentType: string, expiresAt: number): string {
    return createHmac('sha256', uploadSecret())
        .update(`${key}\n${contentType}\n${expiresAt}`)
        .digest('hex');
}

export function verifyLocalUpload(
    key: string,
    contentType: string,
    expiresAt: number,
    signature: string,
): boolean {
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
    const expected = signLocalUpload(key, contentType, expiresAt);
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
}

// ── Operations ────────────────────────────────────────────────────────────

export interface UploadGrant {
    /** Where the browser PUTs the file. Absolute for R2, same-origin locally. */
    uploadUrl: string;
    key: string;
    /** Told to the client so it can fail loudly rather than get a stale 403. */
    expiresAt: string;
}

export async function createUploadGrant(
    key: string,
    contentType: string,
    expiresInSeconds = 600,
): Promise<UploadGrant> {
    if (!isSafeKey(key)) throw new Error('Unsafe object key');
    const expiresAtMs = Date.now() + expiresInSeconds * 1000;

    if (storageDriver() === 'local') {
        const signature = signLocalUpload(key, contentType, expiresAtMs);
        const params = new URLSearchParams({
            key,
            contentType,
            expiresAt: String(expiresAtMs),
            signature,
        });
        return {
            uploadUrl: `/api/storage/local?${params}`,
            key,
            expiresAt: new Date(expiresAtMs).toISOString(),
        };
    }

    // ContentType here sets the type R2 records, but it is *not* enforced: a
    // caller that PUTs a different Content-Type to this URL is accepted (probed
    // against R2 — it returns 200). So the URL grants "write these bytes to this
    // one key", nothing more. What the object actually contains is settled at
    // finalize, which re-reads the stored object's leading bytes and deletes
    // anything whose signature disagrees with the type being claimed.
    const uploadUrl = await getSignedUrl(
        s3(),
        new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
        { expiresIn: expiresInSeconds },
    );
    return { uploadUrl, key, expiresAt: new Date(expiresAtMs).toISOString() };
}

export interface ObjectHead {
    size: number;
    contentType: string;
}

export async function headObject(key: string): Promise<ObjectHead | null> {
    if (!isSafeKey(key)) return null;

    if (storageDriver() === 'local') {
        try {
            const info = await stat(localPath(key));
            return { size: info.size, contentType: '' };
        } catch {
            return null;
        }
    }

    try {
        const result = await s3().send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
        return { size: result.ContentLength ?? 0, contentType: result.ContentType ?? '' };
    } catch {
        return null;
    }
}

/** First bytes of an object, for verifying it really is what it claims to be. */
export async function readObjectPrefix(key: string, length: number): Promise<Uint8Array | null> {
    if (!isSafeKey(key)) return null;

    if (storageDriver() === 'local') {
        try {
            return new Uint8Array((await readFile(localPath(key))).subarray(0, length));
        } catch {
            return null;
        }
    }

    try {
        const result = await s3().send(
            new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: `bytes=0-${length - 1}` }),
        );
        return await result.Body!.transformToByteArray();
    } catch {
        return null;
    }
}

/** Full object body, for streaming back through an authenticated route. */
export async function readObject(key: string): Promise<Uint8Array | null> {
    if (!isSafeKey(key)) return null;

    if (storageDriver() === 'local') {
        try {
            return new Uint8Array(await readFile(localPath(key)));
        } catch {
            return null;
        }
    }

    try {
        const result = await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
        return await result.Body!.transformToByteArray();
    } catch {
        return null;
    }
}

export async function writeObject(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    if (!isSafeKey(key)) throw new Error('Unsafe object key');

    if (storageDriver() === 'local') {
        const path = localPath(key);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, bytes);
        return;
    }

    await s3().send(
        new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: contentType }),
    );
}

export async function deleteObject(key: string): Promise<void> {
    if (!isSafeKey(key)) return;

    if (storageDriver() === 'local') {
        await unlink(localPath(key)).catch(() => undefined);
        return;
    }

    await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })).catch(() => undefined);
}
