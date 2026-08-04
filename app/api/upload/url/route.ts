import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/server/staff-auth';
import { newImageObjectKey, validateImageUpload } from '@/lib/server/image-uploads';
import { createUploadGrant } from '@/lib/server/object-storage';

export const runtime = 'nodejs';

/**
 * Grant to upload one image straight to object storage.
 *
 * As with claim documents, the bytes cannot travel through this function: a
 * serverless request body stops at 4.5 MB and these images may reach 10 MB.
 */
export async function POST(req: Request) {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { contentType, size } = (body ?? {}) as { contentType?: unknown; size?: unknown };

    const validated = validateImageUpload(contentType, size);
    if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

    const key = newImageObjectKey(validated.mimeType);

    try {
        const grant = await createUploadGrant(key, validated.mimeType);
        return NextResponse.json(grant);
    } catch (error) {
        console.error('Failed to create image upload grant:', error);
        return NextResponse.json({ error: 'Failed to start upload' }, { status: 500 });
    }
}
