import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

// POST /api/upload
// multipart/form-data with field "file"
// Returns { url } — a path served from /avatars/<uuid>.<ext>
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No se recibió ningún archivo' },
        { status: 400 },
      );
    }

    // 8 MB max
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo supera los 8 MB' },
        { status: 413 },
      );
    }

    const ext = (file.name.split('.').pop() || 'png').toLowerCase().slice(0, 5);
    const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'png';
    const filename = `${randomUUID()}.${safeExt}`;
    const uploadDir = path.join(process.cwd(), 'public', 'avatars');
    await fs.mkdir(uploadDir, { recursive: true });
    const fullPath = path.join(uploadDir, filename);
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(fullPath, buf);

    return NextResponse.json({ url: `/avatars/${filename}` });
  } catch (e) {
    console.error('[upload]', e);
    return NextResponse.json(
      { error: 'No se pudo subir el archivo' },
      { status: 500 },
    );
  }
}
