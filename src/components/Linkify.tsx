// Tudo após http(s):// ou www. até o próximo espaço pertence à URL.
// Isso inclui query strings grandes (como relatórios codificados em Base64).
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>]+/gi;

/** Renderiza texto transformando URLs em links azuis clicáveis. */
export function Linkify({ text, className }: { text: string; className?: string }) {
  const parts: Array<{ value: string; isUrl: boolean }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push({ value: text.slice(lastIndex, index), isUrl: false });
    parts.push({ value: match[0], isUrl: true });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) parts.push({ value: text.slice(lastIndex), isUrl: false });

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.isUrl) {
          const clean = part.value.replace(/[.,;!?)\]\}]+$/, '');
          const trail = part.value.slice(clean.length);
          const href = clean.startsWith('http') ? clean : `https://${clean}`;
          return (
            <span key={`${i}-${part.value}`}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-blue-500 underline underline-offset-2 [overflow-wrap:anywhere] hover:text-blue-400"
              >
                {clean}
              </a>
              {trail}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </span>
  );
}


