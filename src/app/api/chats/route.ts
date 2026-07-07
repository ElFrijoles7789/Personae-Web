import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

// GET /api/chats?characterId=... — returns ONLY the current user's chats
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ chats: [] });
  }
  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get('characterId');
  const chats = await db.chat.findMany({
    where: {
      userId: user.id,
      ...(characterId ? { characterId } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: { character: true },
  });
  return NextResponse.json({ chats });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Debes iniciar sesión' },
      { status: 401 },
    );
  }
  const body = await req.json();
  const { characterId, title } = body;
  if (!characterId) {
    return NextResponse.json(
      { error: 'characterId es obligatorio' },
      { status: 400 },
    );
  }
  const character = await db.character.findUnique({
    where: { id: characterId },
  });
  if (!character) {
    return NextResponse.json(
      { error: 'Personaje no encontrado' },
      { status: 404 },
    );
  }
  // Only allow starting chats on your own characters OR public ones
  if (character.userId !== user.id && character.visibility !== 'public') {
    return NextResponse.json(
      { error: 'Personaje no encontrado' },
      { status: 404 },
    );
  }
  const chat = await db.chat.create({
    data: {
      characterId,
      userId: user.id,
      title: title || `Chat con ${character.name}`,
    },
  });
  // Seed greeting message if available
  if (character.greeting) {
    await db.message.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: character.greeting,
      },
    });
  }
  const full = await db.chat.findUnique({
    where: { id: chat.id },
    include: { messages: { orderBy: { createdAt: 'asc' } }, character: true },
  });
  return NextResponse.json({ chat: full }, { status: 201 });
}
