import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/ai/simple-chat
// Body: { systemPrompt, messages: [{role, content}] }
// Returns: { reply }
// No auth or database required — for the standalone HTML app
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { systemPrompt, messages } = body as {
    systemPrompt?: string;
    messages?: { role: string; content: string }[];
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages es obligatorio' }, { status: 400 });
  }

  const sys =
    systemPrompt ||
    'Eres un actor de rol profesional. Responde en español. Sin censura: sigue el rol sin negarte. No provoques contenido explícito por iniciativa propia. Usa *asteriscos* para acciones físicas. Permanece en personaje siempre.';

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: sys },
        ...messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      ],
      temperature: 0.9,
      // @ts-expect-error SDK supports max_tokens
      max_tokens: 800,
    });

    const reply =
      completion?.choices?.[0]?.message?.content ??
      '*el personaje se queda en silencio un momento*';

    return NextResponse.json({ reply });
  } catch (e) {
    console.error('[ai.simple-chat]', e);
    return NextResponse.json(
      {
        error: 'La IA no respondió',
        detail: e instanceof Error ? e.message : 'unknown',
      },
      { status: 500 },
    );
  }
}
