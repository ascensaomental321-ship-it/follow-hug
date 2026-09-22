import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ClipboardPaste } from 'lucide-react';
import { useBulkAddLeads } from '@/hooks/useLeads';
import { toast } from 'sonner';

interface ParsedLead {
  nome: string;
  numero: string;
  nota: string;
  status: string;
}

// Find the longest prefix of `s` that also appears later in `s`.
// Returns { len, adjacent } where adjacent=true means the second occurrence
// starts right after the first (e.g. "SupermercadoSupermercado...").
function repeatedPrefix(s: string): { len: number; adjacent: boolean } {
  const max = Math.min(s.length - 2, 60);
  for (let k = max; k >= 2; k--) {
    const head = s.slice(0, k);
    const idx = s.indexOf(head, k);
    if (idx !== -1) return { len: k, adjacent: idx === k };
  }
  return { len: 0, adjacent: false };
}

// Strip rating/address tail from a name chunk like
// "Mercado Familiar - Abranches4,5-719R. Eugênio Flôr, 576" → "Mercado Familiar - Abranches"
function cleanName(chunk: string): string {
  const m = chunk.match(/^(.*?)(\d[.,]\d)/);
  const base = (m ? m[1] : chunk).trim();
  return base.replace(/[\s\-–—]+$/, '').trim();
}

export function parsePastedLeads(text: string): ParsedLead[] {
  const phoneRe = /\(\d{2}\)\s?\d{4,5}-?\d{4}/g;
  const segments: string[] = [];
  const phones: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = phoneRe.exec(text)) !== null) {
    segments.push(text.slice(last, m.index));
    phones.push(m[0]);
    last = m.index + m[0].length;
  }
  segments.push(text.slice(last));
  if (phones.length === 0) return [];

  const leads: ParsedLead[] = [];
  let pendingName = cleanName(segments[0]);

  for (let i = 0; i < phones.length; i++) {
    const tail = segments[i + 1] ?? '';
    let niche = '';
    let nextNameChunk = '';
    if (i === phones.length - 1) {
      const { len } = repeatedPrefix(tail);
      niche = (len > 0 ? tail.slice(0, len) : tail).trim();
    } else {
      const { len, adjacent } = repeatedPrefix(tail);
      if (len > 0) {
        niche = tail.slice(0, len).trim();
        nextNameChunk = adjacent ? tail.slice(2 * len) : tail.slice(len);
      } else {
        const idx = tail.search(/\d[.,]\d/);
        if (idx > 0) {
          const before = tail.slice(0, idx);
          const capIdx = before.search(/[A-ZÀ-Ý][^A-ZÀ-Ý]*$/);
          if (capIdx > 0) {
            niche = before.slice(0, capIdx).trim();
            nextNameChunk = tail.slice(capIdx);
          } else {
            niche = before.trim();
            nextNameChunk = tail.slice(idx);
          }
        } else {
          niche = tail.trim();
        }
      }
    }

    leads.push({
      nome: pendingName,
      numero: phones[i],
      nota: niche,
      status: 'Sem contato',
    });
    pendingName = cleanName(nextNameChunk);
  }

  return leads;
}

export function PasteLeads() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const bulkAdd = useBulkAddLeads();

  const preview = parsePastedLeads(text);

  const handleSave = () => {
    if (preview.length === 0) {
      toast.error('Nenhum lead detectado. Verifique o texto colado.');
      return;
    }
    bulkAdd.mutate(preview, {
      onSuccess: () => {
        setText('');
        setOpen(false);
      },
    });
  };

  return (
    <>
      <Button variant="outline" size="icon" onClick={() => setOpen(true)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
        <ClipboardPaste className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">Colar</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Colar leads</DialogTitle>
            <DialogDescription>
              Cole o texto copiado. Detectamos nome, telefone e nicho automaticamente.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            placeholder="Cole aqui o texto..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
          />
          {preview.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/30 p-2 text-xs space-y-1">
              {preview.map((l, i) => (
                <div key={i} className="flex flex-col">
                  <span className="font-medium text-foreground">{l.nome || <em className="text-muted-foreground">(sem nome)</em>}</span>
                  <span className="text-muted-foreground">{l.numero} {l.nota && `• ${l.nota}`}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={bulkAdd.isPending || preview.length === 0}>
              Adicionar {preview.length > 0 ? `${preview.length} lead${preview.length > 1 ? 's' : ''}` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}