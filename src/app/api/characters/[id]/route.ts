import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const character = await db.character.findUnique({ where: { id } });
  if (!character) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }
  return NextResponse.json({ character });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
    published,
  } = body;

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
        ...(published !== undefined ? { published } : {}),
      },
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
