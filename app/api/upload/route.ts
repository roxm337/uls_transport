import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/server/staff-auth';
import { validateCsrf } from '@/lib/csrf';
import {
    IMAGE_OBJECT_PREFIX,
    imageUrlForKey,
    isUploadableImageType,
    MAX_IMAGE_UPLOAD_SIZE,
} from '@/lib/server/image-uploads';
import { matchesSignature, SIGNATURE_PREFIX_BYTES } from '@/lib/server/file-signatures';
import { deleteObject, headObject, readObjectPrefix } from '@/lib/server/object-storage';

export const runtime = 'nodejs';

/**
 * Confirm an image whose bytes are already in storage, and hand back the URL
 * the app should store.
 *
 * The upload no longer passes through here — a serverless request body stops at
 * 4.5 MB and these images may reach 10 MB — so the stored object is inspected
 * instead of the request: its real size, and leading bytes that match the type
 * being claimed. Anything that fails is deleted rather than left behind.
 */
export async function POST(request: Request) {
    const csrfError = await validateCsrf(request);
    if (csrfError) return csrfError;

    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { key, contentType } = (body ?? {}) as { key?: unknown; contentType?: unknown };

    if (!isUploadableImageType(contentType)) {
        return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }
    if (typeof key !== 'string' || !key.startsWith(IMAGE_OBJECT_PREFIX)) {
        return NextResponse.json({ error: 'Invalid upload reference' }, { status: 400 });
    }

    const head = await headObject(key);
    if (!head) return NextResponse.json({ error: 'Upload not found' }, { status: 404 });

    if (head.size <= 0 || head.size > MAX_IMAGE_UPLOAD_SIZE) {
        await deleteObject(key);
        return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    const prefix = await readObjectPrefix(key, SIGNATURE_PREFIX_BYTES);
    if (!prefix || !matchesSignature(prefix, contentType)) {
        await deleteObject(key);
        return NextResponse.json({ error: 'File content does not match its type.' }, { status: 400 });
    }

    return NextResponse.json({ url: imageUrlForKey(key) }, { status: 200 });
}
