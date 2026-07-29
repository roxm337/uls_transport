import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { requireStaff } from '@/lib/server/staff-auth';
import { validateCsrf } from '@/lib/csrf';

/** Accepted image types, and the extension each one is stored under. */
const EXTENSION_BY_TYPE: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
};

export async function POST(request: NextRequest) {
    // This route used to accept uploads from anyone: no session check meant
    // any unauthenticated request could write 10MB to disk, without limit.
    const csrfError = await validateCsrf(request);
    if (csrfError) return csrfError;

    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type (only images)
        if (!(file.type in EXTENSION_BY_TYPE)) {
            return NextResponse.json(
                { error: 'Invalid file type. Only images are allowed.' },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File size exceeds 10MB limit' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        // Name the file ourselves rather than deriving it from user input:
        // the extension comes from the validated MIME type, so nothing the
        // client sends can shape the path or the served content type.
        const extension = EXTENSION_BY_TYPE[file.type];
        const filename = `${randomUUID()}${extension}`;
        const filepath = join(uploadsDir, filename);

        // Write file
        await writeFile(filepath, buffer);

        // Return the API-served URL (standalone mode doesn't serve public/ files)
        const publicUrl = `/api/uploads/${filename}`;

        return NextResponse.json({ url: publicUrl }, { status: 200 });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        );
    }
}
