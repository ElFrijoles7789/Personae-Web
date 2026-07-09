import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';

// POST /api/ai/tts
// Body: { text, voiceModelId? }
// If voiceModelId is provided and belongs to the user + is ready, use its voiceId.
// Otherwise, fall back to the default voice "tongtong".
// Returns an audio/wav buffer.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, voiceModelId } = body as { text?: string; voiceModelId?: string };
  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'text es obligatorio' }, { status: 400 });
  }
  // Truncate to SDK max (1024 chars)
  const cleanText = text.trim().slice(0, 1000);

  let voiceId = 'tongtong'; // default voice
  const user = await getCurrentUser();
  if (user && voiceModelId) {
    const vm = await db.voiceModel.findUnique({ where: { id: voiceModelId } });
    if (vm && vm.userId === user.id && vm.status === 'ready') {
      voiceId = vm.voiceId;
    }
  }

  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const response = await zai.audio.tts.create({
      input: cleanText,
      voice: voiceId,
      speed: 1.0,
      response_format: 'wav',
      stream: false,
    });
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e) {
    console.error('[ai.tts]', e);
    return NextResponse.json(
      { error: 'No se pudo generar el audio', detail: e instanceof Error ? e.message : 'unknown' },
      { status: 500 },
    );
  }
}
