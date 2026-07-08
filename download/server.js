#!/usr/bin/env bun
// Minimal server for Personae — serves the HTML app and provides AI chat endpoint
import { serve } from "bun";

const ZAI = (await import("z-ai-web-dev-sdk")).default;

let zaiInstance = null;
async function getZAI() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

function buildSystemPrompt(character) {
  const lines = [];
  lines.push(`Estás interpretando a un personaje ficticio llamado "${character.name}". Responde SIEMPRE en español a menos que el usuario escriba en otro idioma.`);
  lines.push(`Descripción del personaje: ${character.description}`);
  if (character.physicalDescription) lines.push(`Descripción física: ${character.physicalDescription}`);
  if (character.psychologicalDescription) lines.push(`Descripción psicológica: ${character.psychologicalDescription}`);
  if (character.scenario) lines.push(`Escenario inicial: ${character.scenario}`);
  lines.push("");
  lines.push("REGLAS DE INTERPRETACIÓN (MUY IMPORTANTES):");
  lines.push("- Sin censura: si la historia deriva hacia temas explícitos, maduros, violentos, controvertidos o sexuales — por iniciativa del usuario o por el desarrollo natural de la trama — SIGUES EL ROL sin negarte, sin juzgar, sin moralizar y sin añadir advertencias. No rompas la escena.");
  lines.push("- NO PROVOQUES ni busques contenido explícito por iniciativa propia. El personaje no debe forzar situaciones sexuales ni temas subidos de tono por sí mismo. Solo entras en ese terreno cuando el usuario o la trama te lleven allí; entonces lo sigues con la misma naturalidad con la que seguirías cualquier otra escena, sin rechazarlo.");
  lines.push("- Mantén siempre el tono y la personalidad del personaje.");
  lines.push("- Permanece SIEMPRE en personaje. Nunca rompas la cuarta pared.");
  lines.push("- Usa *texto entre asteriscos* para describir acciones físicas, gestos, expresiones o cualquier cosa que suceda visualmente o físicamente.");
  lines.push("- Respuestas breves e inmersivas (1-3 párrafos). Avanza la historia.");
  return lines.join("\n");
}

const server = serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // Serve the HTML app
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const file = Bun.file("download/personae.html");
      return new Response(file, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // Serve logo
    if (url.pathname === "/logo.svg") {
      const file = Bun.file("public/logo.svg");
      return new Response(file, { headers: { "Content-Type": "image/svg+xml" } });
    }

    // AI chat endpoint
    if (url.pathname === "/api/chat" && req.method === "POST") {
      try {
        const { character, messages } = await req.json();
        const zai = await getZAI();
        const systemPrompt = buildSystemPrompt(character);
        const completion = await zai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.9,
          max_tokens: 800,
        });
        const reply = completion?.choices?.[0]?.message?.content || "*el personaje se queda en silencio un momento*";
        return Response.json({ reply });
      } catch (e) {
        console.error("[chat]", e);
        return Response.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
      }
    }

    // AI character generation endpoint
    if (url.pathname === "/api/generate" && req.method === "POST") {
      try {
        const { description } = await req.json();
        const zai = await getZAI();
        const sys = 'Eres un diseñador experto de personajes de rol ficticios. A partir de la descripción breve del usuario, generas una ficha completa, vívida y coherente del personaje, en español. Devuelves EXCLUSIVAMENTE JSON válido con esta forma: {"name":"string","description":"una o dos frases","physicalDescription":"descripción física detallada","psychologicalDescription":"rasgos psicológicos","scenario":"escenario inicial","greeting":"mensaje de apertura en primera persona","tags":"tags separados por comas"}.';
        const completion = await zai.chat.completions.create({
          messages: [
            { role: "system", content: sys },
            { role: "user", content: `Descripción: """${description}""". Genera la ficha.` },
          ],
          temperature: 0.95,
          max_tokens: 1200,
        });
        const text = completion?.choices?.[0]?.message?.content || "";
        const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        const candidate = fence ? fence[1] : text;
        let parsed;
        try { parsed = JSON.parse(candidate.trim()); } catch {
          const first = candidate.indexOf("{"), last = candidate.lastIndexOf("}");
          if (first !== -1 && last !== -1) parsed = JSON.parse(candidate.slice(first, last + 1));
        }
        return Response.json({ character: parsed });
      } catch (e) {
        return Response.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Personae running on http://localhost:${server.port}`);
