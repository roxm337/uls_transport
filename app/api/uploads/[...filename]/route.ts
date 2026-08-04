import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/server/staff-auth';
import { imageContentType, imageKeyForPath } from '@/lib/server/image-uploads';
import { isSafeKey, readObject } from '@/lib/server/object-storage';

export const runtime = 'nodejs';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filename: string[] }> }
) {
    // Uploaded files are internal content; serving them to anyone with the URL
    // would leak them outside the CRM. Same-origin <img> requests carry the
    // session cookie, so this stays transparent to the app.
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const { filename } = await params;
    const key = imageKeyForPath(filename.join('/'));
    if (!isSafeKey(key)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const bytes = await readObject(key);
    if (!bytes) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Copied into a plain ArrayBuffer-backed view so it satisfies BodyInit.
    return new NextResponse(new Uint8Array(bytes), {
        headers: {
            // Derived from the extension we assigned at upload, never from the
            // caller — and pinned with nosniff so the browser cannot be talked
            // into treating an image as anything else.
            'Content-Type': imageContentType(key),
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': 'sandbox',
            // private: the response is session-scoped, so no shared cache
            // (proxy, CDN) may hold on to it.
            'Cache-Control': 'private, max-age=31536000, immutable',
        },
    });
}
