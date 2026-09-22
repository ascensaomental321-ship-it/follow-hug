import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LinkifiedTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const URL_RE = /https?:\/\/[^\s<>]+/gi;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function linkifiedHtml(value: string) {
  let lastIndex = 0;
  let html = '';

  for (const match of value.matchAll(URL_RE)) {
    const index = match.index ?? 0;
    html += escapeHtml(value.slice(lastIndex, index));
    const url = escapeHtml(match[0]);
    html += `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline underline-offset-2">${url}</a>`;
    lastIndex = index + match[0].length;
  }

  return (html + escapeHtml(value.slice(lastIndex))).replace(/\n/g, '<br>');
}

export function LinkifiedTextarea({ id, value, onChange, placeholder, className }: LinkifiedTextareaProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);

  // Conteúdo inicial — só na montagem (nunca usar dangerouslySetInnerHTML,
  // pois o React reescreveria o innerHTML a cada tecla e o cursor iria pro início)
  useEffect(() => {
    const editor = editorRef.current;
    if (editor) editor.innerHTML = linkifiedHtml(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || focusedRef.current || editor.innerText.replace(/\n$/, '') === value) return;
    editor.innerHTML = linkifiedHtml(value);
  }, [value]);

  return (
    <div className="relative">
      {!value && (
        <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
          {placeholder}
        </span>
      )}
      <div
        ref={editorRef}
        id={id}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        className={cn(
          'h-28 min-h-28 max-h-28 overflow-y-auto w-full whitespace-pre-wrap break-words rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_a]:cursor-pointer [&_a]:break-all [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
          className,
        )}
        onFocus={() => { focusedRef.current = true; }}
        onInput={(event) => onChange(event.currentTarget.innerText.replace(/\n$/, ''))}
        onBlur={(event) => {
          focusedRef.current = false;
          event.currentTarget.innerHTML = linkifiedHtml(event.currentTarget.innerText.replace(/\n$/, ''));
        }}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          const anchor = target.closest('a');
          const href = anchor?.getAttribute('href');
          if (href) window.open(href, '_blank', 'noopener,noreferrer');
        }}
      />
    </div>
  );
}