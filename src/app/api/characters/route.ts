import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

// GET /api/characters — returns ONLY the current user's characters (private + public).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ characters: [] });
  }
  const characters = await db.character.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: { voiceModel: true },
  });
  return NextResponse.json({ characters });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Debes iniciar sesión para crear personajes' },
      { status: 401 },
    );
  }
  try {
    const body = await req.json();
    const {
      name,
      description,
      physicalDescription,
      psychologicalDescription,
      scenario,
      greeting,
      avatar,
      avatarSource,
      creatorName,
      tags,
      visibility,
      voiceModelId,
    } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Nombre y descripción son obligatorios' },
        { status: 400 },
      );
    }

    // Validate voiceModelId belongs to user and is ready (if provided)
    let validVoiceModelId: string | null = null;
    if (voiceModelId) {
      const vm = await db.voiceModel.findUnique({ where: { id: voiceModelId } });
      if (vm && vm.userId === user.id && vm.status === 'ready') {
        validVoiceModelId = vm.id;
      }
    }

    const character = await db.character.create({
      data: {
        name,
        description,
        physicalDescription: physicalDescription ?? null,
        psychologicalDescription: psychologicalDescription ?? null,
        scenario: scenario ?? null,
        greeting: greeting ?? null,
        avatar: avatar ?? null,
        avatarSource: avatarSource ?? null,
        creatorName: creatorName ?? null,
        tags: tags ?? null,
        visibility: visibility === 'public' ? 'public' : 'private',
        voiceModelId: validVoiceModelId,
        userId: user.id,
      },
      include: { voiceModel: true },
    });

    return NextResponse.json({ character }, { status: 201 });
  } catch (e) {
    console.error('[characters.create]', e);
    return NextResponse.json(
      { error: 'No se pudo crear el personaje' },
      { status: 500 },
    );
  }
}
