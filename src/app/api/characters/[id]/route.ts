import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  const character = await db.character.findUnique({
    where: { id },
    include: { voiceModel: true },
  });
  if (!character) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }
  // Visible if public OR if owner
  if (character.visibility !== 'public' && character.userId !== user?.id) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }
  return NextResponse.json({ character });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const existing = await db.character.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

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

  // Validate voiceModelId if provided (null = unlink)
  let validVoiceModelId: string | null | undefined = undefined;
  if (voiceModelId !== undefined) {
    if (voiceModelId === null || voiceModelId === '') {
      validVoiceModelId = null;
    } else {
      const vm = await db.voiceModel.findUnique({ where: { id: voiceModelId } });
      if (vm && vm.userId === user.id && vm.status === 'ready') {
        validVoiceModelId = vm.id;
      } else {
        validVoiceModelId = null;
      }
    }
  }

  try {
    const character = await db.character.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(physicalDescription !== undefined ? { physicalDescription } : {}),
        ...(psychologicalDescription !== undefined
          ? { psychologicalDescription }
          : {}),
        ...(scenario !== undefined ? { scenario } : {}),
        ...(greeting !== undefined ? { greeting } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
        ...(avatarSource !== undefined ? { avatarSource } : {}),
        ...(creatorName !== undefined ? { creatorName } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(visibility !== undefined
          ? { visibility: visibility === 'public' ? 'public' : 'private' }
          : {}),
        ...(validVoiceModelId !== undefined ? { voiceModelId: validVoiceModelId } : {}),
      },
      include: { voiceModel: true },
    });
    return NextResponse.json({ character });
  } catch (e) {
    console.error('[characters.update]', e);
    return NextResponse.json(
      { error: 'No se pudo actualizar' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const existing = await db.character.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  try {
    await db.character.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[characters.delete]', e);
    return NextResponse.json(
      { error: 'No se pudo eliminar' },
      { status: 500 },
    );
  }
}
