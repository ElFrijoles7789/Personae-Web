import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const characters = await db.character.findMany({
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ characters });
}

export async function POST(req: NextRequest) {
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
    } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Nombre y descripción son obligatorios' },
        { status: 400 },
      );
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
      },
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
