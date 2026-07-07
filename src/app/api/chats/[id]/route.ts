import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const chat = await db.chat.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      character: true,
    },
  });
  if (!chat) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }
  return NextResponse.json({ chat });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const chat = await db.chat.update({
    where: { id },
    data: { ...(body.title ? { title: body.title } : {}) },
  });
  return NextResponse.json({ chat });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await db.chat.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
