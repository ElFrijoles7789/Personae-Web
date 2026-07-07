import React from 'react';

/**
 * Parses a string and converts *text between asterisks* into italic <em>
 * elements (representing physical actions / scene narration).
 * Also handles line breaks.
 */
export function renderRichText(text: string): React.ReactNode[] {
  if (!text) return [];
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*[^*]+\*|\*\*[^*]+\*\*)/g);
    return (
      <div key={lineIdx} className="min-h-[1em]">
        {parts.map((part, i) => {
          if (!part) return null;
          // **bold** (in case the AI uses markdown bold)
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return (
              <strong key={i} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          // *italic action*
          if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            return (
              <em
                key={i}
                className="italic text-muted-foreground not-italic"
                style={{ fontStyle: 'italic' }}
              >
                {part.slice(1, -1)}
              </em>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  });
}
