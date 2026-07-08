/**
 * Detects the language of a given text using heuristics.
 * Returns a BCP-47 language tag (e.g. "es", "en", "pt", "fr", "it", "de").
 */
export function detectLanguage(text: string): string {
  if (!text) return 'es';
  const sample = text.toLowerCase().slice(0, 500);

  // CJK characters → Chinese/Japanese/Korean
  if (/[\u4e00-\u9fff]/.test(sample)) return 'zh';
  if (/[\u3040-\u30ff]/.test(sample)) return 'ja';
  if (/[\uac00-\ud7af]/.test(sample)) return 'ko';
  if (/[\u0600-\u06ff]/.test(sample)) return 'ar';
  if (/[\u0400-\u04ff]/.test(sample)) return 'ru';

  // Latin-script languages: score by common stopwords/character patterns
  const scores: Record<string, number> = {
    es: 0, en: 0, pt: 0, fr: 0, it: 0, de: 0,
  };

  // Spanish markers
  const esWords = /\b(el|la|los|las|que|de|en|y|a|un|una|por|con|su|para|como|más|pero|no|sí|qué|cómo|dónde|cuándo|quién|porque|muy|también|ya|pero|esto|ese|aquel|aquí|allí|soy|eres|es|somos|son|tengo|tienes|tiene|hacer|poder|decir|ir|ver|dar|saber|querer| llegar|pasar|deber|creer|hablar|llevar|dejar|seguir|encontrar|llamar)\b/g;
  scores.es += (sample.match(esWords) || []).length;
  if (/ñ|á|é|í|ó|ú|ü|¿|¡/.test(sample)) scores.es += 3;

  // English markers
  const enWords = /\b(the|of|and|to|a|in|is|it|you|that|he|was|for|on|are|with|as|his|they|at|be|this|have|from|or|one|had|by|word|but|not|what|all|were|we|when|your|can|said|there|use|an|each|which|she|do|how|their|if|will|up|other|about|out|many|then|them|these|so|some|her|would|make|like|him|into|time|has|look|two|more|write|go|see|number|no|way|could|people|my|than|first|water|been|call|who|its|now|find)\b/g;
  scores.en += (sample.match(enWords) || []).length;

  // Portuguese markers
  const ptWords = /\b(o|a|os|as|que|de|em|e|para|com|não|uma|um|por|seu|sua|como|mais|mas|sim|não|que|como|onde|quando|quem|porque|muito|também|já|este|esse|aquele|aqui|ali|sou|és|é|somos|são|tenho|tens|tem|fazer|poder|dizer|ir|ver|dar|saber|querer|chegar|passar|dever|acreditar|falar|levar|deixar|seguir|encontrar)\b/g;
  scores.pt += (sample.match(ptWords) || []).length;
  if (/ã|õ|ç|á|é|í|ó|ú|â|ê|ô/.test(sample)) scores.pt += 2;

  // French markers
  const frWords = /\b(le|la|les|de|et|à|en|un|une|que|qui|dans|pour|avec|sur|ne|pas|ce|se|sa|son|mais|ou|où|comment|quand|pourquoi|parce|très|aussi|déjà|ici|être|avoir|faire|pouvoir|dire|aller|voir|donner|savoir|vouloir|venir|passer|devoir|croire|parler|porter|laisser|suivre|trouver)\b/g;
  scores.fr += (sample.match(frWords) || []).length;
  if (/ç|œ|à|â|é|è|ê|ë|ï|î|ô|û|ù|ü/.test(sample)) scores.fr += 2;

  // Italian markers
  const itWords = /\b(il|la|i|le|di|che|in|e|per|con|non|un|una|da|del|della|come|più|ma|sì|no|cosa|come|dove|quando|chi|perché|molto|anche|già|questo|quello|qui|lì|sono|sei|è|siamo|sono|ho|hai|ha|fare|potere|dire|andare|vedere|dare|sapere|volere|venire|passare|dovere|credere|parlare|portare|lasciare|seguire|trovare)\b/g;
  scores.it += (sample.match(itWords) || []).length;

  // German markers
  const deWords = /\b(der|die|das|und|in|den|von|zu|mit|auf|für|ist|im|dem|nicht|ein|eine|einer|eines|als|auch|es|an|werden|aus|er|hat|dass|sie|nach|wird|bei|einer|um|am|sind|noch|wie|ein|wenn|nur|oder|aber|vor|zur|bis|mehr|durch|seine|ihre|was|unser|sein|können|dürfen|müssen|sollen|wollen|wissen|machen|gehen|sehen|geben|sagen|kommen|lassen|stehen|finden|bleiben|sprechen)\b/g;
  scores.de += (sample.match(deWords) || []).length;
  if (/ä|ö|ü|ß/.test(sample)) scores.de += 3;

  // Find the highest score
  let best = 'es';
  let bestScore = 0;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }
  return best;
}

/**
 * Maps a short language code to a full BCP-47 locale tag
 * that the browser's speechSynthesis API understands.
 */
export function languageToLocale(lang: string): string {
  const map: Record<string, string> = {
    es: 'es-ES',
    en: 'en-US',
    pt: 'pt-PT',
    fr: 'fr-FR',
    it: 'it-IT',
    de: 'de-DE',
    zh: 'zh-CN',
    ja: 'ja-JP',
    ko: 'ko-KR',
    ar: 'ar-SA',
    ru: 'ru-RU',
  };
  return map[lang] || 'es-ES';
}
