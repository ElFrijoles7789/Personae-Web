import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

// Available SDK voices — the user picks which sounds closest to their samples
const AVAILABLE_VOICES = [
  { id: 'tongtong', label: 'Tongtong — Cálida y cercana' },
  { id: 'chuichui', label: 'Chuichui — Viva y juvenil' },
  { id: 'xiaochen', label: 'Xiaochen — Serena y profesional' },
  { id: 'jam', label: 'Jam — Caballero británico' },
  { id: 'kazi', label: 'Kazi — Clara y estándar' },
  { id: 'douji', label: 'Douji — Natural y fluida' },
  { id: 'luodo', label: 'Luodo — Expresiva y emotiva' },
];

export async function GET() {
  return NextResponse.json({ voices: AVAILABLE_VOICES });
}

// POST /api/voice-models/[id]/train — mark voice model as ready with selected voiceId
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
  const voiceId = (body?.voiceId || '').toString().trim();
  const valid = AVAILABLE_VOICES.some((v) => v.id === voiceId);
  if (!valid) {
    return NextResponse.json({ error: 'Voz no válida' }, { status: 400 });
  }
  // Require at least 30 seconds of samples total to "train"
  if (vm.totalDurationSec < 30) {
    return NextResponse.json(
      { error: `Necesitas al menos 30 segundos de audio (tienes ${vm.totalDurationSec}s)` },
      { status: 400 },
    );
  }
  const updated = await db.voiceModel.update({
    where: { id },
    data: { status: 'ready', voiceId },
  });
  return NextResponse.json({ voiceModel: updated });
}
