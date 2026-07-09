import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

// POST /api/characters/[id]/publish — toggle visibility between "public" and "private"
// Body: { visibility?: "public" | "private" } — defaults to "public"
export async function POST(
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
  let body: { visibility?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const visibility =
    body.visibility === 'private' ? 'private' : 'public';
  const character = await db.character.update({
    where: { id },
    data: { visibility },
  });
  return NextResponse.json({ character });
}
