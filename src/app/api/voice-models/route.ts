import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

// GET /api/voice-models — list current user's voice models
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ voiceModels: [] });
  const voiceModels = await db.voiceModel.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { characters: true } } },
  });
  return NextResponse.json({ voiceModels });
}

// POST /api/voice-models — create a new voice model (draft)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  }
  const body = await req.json();
  const name = (body?.name || '').toString().trim();
  if (!name) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }
  const vm = await db.voiceModel.create({
    data: { name, userId: user.id, status: 'draft' },
  });
  return NextResponse.json({ voiceModel: vm }, { status: 201 });
}
