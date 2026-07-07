import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

// POST /api/messages/[id]/rewind?mode=to_before|to_here
//  - to_before (default): delete target message AND everything after it.
//  - to_here: delete everything STRICTLY AFTER the target message, keeping the target.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const url = new URL(req.url);
  const mode = (url.searchParams.get('mode') || 'to_before') as
    | 'to_before'
    | 'to_here';

  const target = await db.message.findUnique({
    where: { id },
    include: { chat: true },
  });
  if (!target || target.chat.userId !== user.id) {
    return NextResponse.json(
      { error: 'Mensaje no encontrado' },
      { status: 404 },
    );
  }

  if (mode === 'to_before') {
    await db.message.deleteMany({
      where: {
        chatId: target.chatId,
        createdAt: { gte: target.createdAt },
      },
    });
  } else {
    await db.message.deleteMany({
      where: {
        chatId: target.chatId,
        createdAt: { gt: target.createdAt },
      },
    });
  }

  const messages = await db.message.findMany({
    where: { chatId: target.chatId },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ messages });
}
