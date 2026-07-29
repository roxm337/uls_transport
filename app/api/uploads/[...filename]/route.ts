import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { requireStaff } from '@/lib/server/staff-auth';

const MIME_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
};

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
    const file = filename.join('/');

    // Prevent directory traversal
    if (file.includes('..')) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const filepath = join(process.cwd(), 'public', 'uploads', file);

    if (!existsSync(filepath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const ext = '.' + file.split('.').pop()?.toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const buffer = await readFile(filepath);

    return new NextResponse(buffer, {
        headers: {
            'Content-Type': contentType,
            // private: the response is session-scoped, so no shared cache
            // (proxy, CDN) may hold on to it.
            'Cache-Control': 'private, max-age=31536000, immutable',
        },
    });
}
