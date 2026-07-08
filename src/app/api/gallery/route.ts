import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/gallery — list ALL public characters from every user
export async function GET() {
  const characters = await db.character.findMany({
    where: { visibility: 'public' },
    orderBy: { updatedAt: 'desc' },
    include: {
      user: {
        select: { name: true },
      },
      voiceModel: true,
    },
  });
  return NextResponse.json({ characters });
}
