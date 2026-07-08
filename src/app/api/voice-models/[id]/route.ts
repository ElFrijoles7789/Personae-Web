import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const existing = await db.voiceModel.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  // Unlink any characters using this voice model, then delete
  await db.character.updateMany({
    where: { voiceModelId: id },
    data: { voiceModelId: null },
  });
  await db.voiceModel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
