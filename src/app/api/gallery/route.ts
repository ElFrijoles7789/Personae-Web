import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/gallery — list published characters
export async function GET() {
  const characters = await db.character.findMany({
    where: { published: true },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ characters });
}
