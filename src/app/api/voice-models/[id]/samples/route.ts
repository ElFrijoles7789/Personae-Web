import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

// POST /api/voice-models/[id]/samples — upload an audio sample to a voice model
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const vm = await db.voiceModel.findUnique({ where: { id } });
  if (!vm || vm.userId !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
  }
  // 25 MB max per sample
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'El archivo supera los 25 MB' }, { status: 413 });
  }
  const allowed = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/x-m4a', 'audio/mp4'];
  if (file.type && !allowed.includes(file.type) && !file.type.startsWith('audio/')) {
    return NextResponse.json({ error: 'Formato de audio no soportado' }, { status: 400 });
  }

  const ext = (file.name.split('.').pop() || 'wav').toLowerCase().slice(0, 5);
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'wav';
  const filename = `${randomUUID()}.${safeExt}`;
  const uploadDir = path.join(process.cwd(), 'public', 'voice-samples');
  await fs.mkdir(uploadDir, { recursive: true });
  const fullPath = path.join(uploadDir, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(fullPath, buf);

  // Use real duration from client if provided; otherwise estimate from file size
  const clientDuration = parseInt(formData.get('durationSec') as string, 10);
  const estimatedSec =
    isFinite(clientDuration) && clientDuration > 0
      ? clientDuration
      : Math.max(1, Math.round(buf.length / 100000));

  const samples = vm.samples ? vm.samples.split(',').filter(Boolean) : [];
  samples.push(`/voice-samples/${filename}`);
  const totalDurationSec = vm.totalDurationSec + estimatedSec;

  const updated = await db.voiceModel.update({
    where: { id },
    data: { samples: samples.join(','), totalDurationSec },
  });

  return NextResponse.json({
    voiceModel: updated,
    sampleUrl: `/voice-samples/${filename}`,
    estimatedSec,
  });
}
