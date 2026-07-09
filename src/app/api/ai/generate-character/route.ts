import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

interface GeneratedCharacter {
  name: string;
  description: string;
  physicalDescription: string;
  psychologicalDescription: string;
  scenario: string;
  greeting: string;
  tags: string;
}

function extractJson(text: string): GeneratedCharacter | null {
  // try code fences first
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    // try to find first { ... last }
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      try {
        return JSON.parse(candidate.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// POST /api/ai/generate-character
// body: { description: string }
// Returns: a fully-formed character profile generated from the user description
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { description } = body as { description?: string };
  if (!description || description.trim().length < 3) {
    return NextResponse.json(
      { error: 'La descripción es obligatoria' },
      { status: 400 },
    );
  }

  const sys =
    'Eres un diseñador experto de personajes de rol ficticios. A partir de la descripción breve del usuario, generas una ficha completa, vívida y coherente del personaje, en español. Devuelves EXCLUSIVAMENTE JSON válido, sin texto adicional, con esta forma: ' +
    JSON.stringify({
      name: 'string',
      description: 'una o dos frases que resuman quién es',
      physicalDescription: 'descripción física detallada',
      psychologicalDescription: 'rasgos psicológicos y personalidad',
      scenario: 'escenario inicial donde se encuentra el personaje',
      greeting: 'mensaje de apertura en primera persona, en personaje',
      tags: 'tags separados por comas',
    }) +
    '. El personaje puede tener cualquier temática, incluidas maduras o explícitas si la descripción lo sugiere. No censures la creatividad.';

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: sys },
        {
          role: 'user',
          content:
            'Descripción del usuario: """' +
            description.trim() +
            '""". Genera la ficha.',
        },
      ],
      temperature: 0.95,
      // @ts-expect-error SDK accepts max_tokens
      max_tokens: 1200,
    });
    const text = completion?.choices?.[0]?.message?.content ?? '';
    const parsed = extractJson(text);
    if (!parsed) {
      return NextResponse.json(
        {
          error: 'No se pudo parsear la respuesta de la IA',
          raw: text,
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ character: parsed });
  } catch (e) {
    console.error('[ai.generate-character]', e);
    return NextResponse.json(
      {
        error: 'La IA no pudo generar el personaje',
        detail: e instanceof Error ? e.message : 'unknown',
      },
      { status: 500 },
    );
  }
}
