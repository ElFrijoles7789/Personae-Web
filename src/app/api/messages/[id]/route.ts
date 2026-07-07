import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
  await db.message.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
