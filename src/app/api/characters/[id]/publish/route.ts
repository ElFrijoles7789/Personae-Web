import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Publish a character (toggle on by default; pass { published: false } in body to unpublish)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { published?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const published = body.published ?? true;
  const character = await db.character.update({
    where: { id },
    data: { published },
  });
  return NextResponse.json({ character });
}
