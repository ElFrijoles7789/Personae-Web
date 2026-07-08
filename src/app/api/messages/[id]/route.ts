import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

async function assertMessageOwnership(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 401 as const };
  const target = await db.message.findUnique({
    where: { id },
    include: { chat: true },
  });
  if (!target || target.chat.userId !== user.id) {
    return { error: 404 as const };
  }
  return { user, target };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await assertMessageOwnership(id);
  if ('error' in result) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: result.error },
    );
  }
  const body = await req.json();
  const { content } = body;
  if (!content || typeof content !== 'string') {
    return NextResponse.json(
      { error: 'content es obligatorio' },
      { status: 400 },
    );
  }
  const message = await db.message.update({
    where: { id },
    data: { content },
  });
  return NextResponse.json({ message });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await assertMessageOwnership(id);
  if ('error' in result) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: result.error },
    );
  }
  await db.message.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
