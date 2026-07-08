import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

// POST /api/voice-models/[id]/train — configure the voice model with selected system voice + pitch + rate
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
  const body = await req.json();
  const systemVoiceURI = (body?.systemVoiceURI || '').toString().trim();
  const systemVoiceName = (body?.systemVoiceName || '').toString().trim();
  const systemVoiceLang = (body?.systemVoiceLang || '').toString().trim();
  const pitch = typeof body?.pitch === 'number' ? Math.max(0.5, Math.min(2.0, body.pitch)) : 1.0;
  const rate = typeof body?.rate === 'number' ? Math.max(0.5, Math.min(2.0, body.rate)) : 1.0;

  if (!systemVoiceURI) {
    return NextResponse.json({ error: 'Selecciona una voz del sistema' }, { status: 400 });
  }

  // Require at least 1 audio sample
  const samples = vm.samples ? vm.samples.split(',').filter(Boolean) : [];
  if (samples.length === 0) {
    return NextResponse.json(
      { error: 'Sube al menos un audio antes de entrenar' },
      { status: 400 },
    );
  }

  const updated = await db.voiceModel.update({
    where: { id },
    data: {
      status: 'ready',
      systemVoiceURI,
      systemVoiceName: systemVoiceName || null,
      systemVoiceLang: systemVoiceLang || null,
      pitch,
      rate,
    },
  });
  return NextResponse.json({ voiceModel: updated });
}
