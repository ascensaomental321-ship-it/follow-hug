import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Upload } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

import { useBulkAddLeads } from '@/hooks/useLeads';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';

interface ParsedLead {
  nome: string;
  numero: string;
  nota: string;
  status: string;
}

export function ImportSpreadsheet() {
  const inputRef = useRef<HTMLInputElement>(null);
  const bulkAdd = useBulkAddLeads();
  const [allLeads, setAllLeads] = useState<ParsedLead[]>([]);
  const [startRow, setStartRow] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);


  const cleanValue = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    // ExcelJS rich text objects
    if (typeof val === 'object' && val !== null) {
      if ('text' in val) return String((val as { text: string }).text).trim();
      if ('richText' in val) {
        const rt = val as { richText: Array<{ text: string }> };
        return rt.richText.map(r => r.text).join('').trim();
      }
      if ('result' in val) return String((val as { result: unknown }).result).trim();
    }
    return String(val).trim();
  };

  const looksLikeHeader = (nome: string, numero: string): boolean => {
    const headerWords = ['nome', 'name', 'número', 'numero', 'telefone', 'phone', 'contato', 'cel', 'whatsapp'];
    const lower = (nome + ' ' + numero).toLowerCase();
    return headerWords.some(w => lower.includes(w));
  };

  const parseCSV = (text: string): ParsedLead[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const leads: ParsedLead[] = [];
    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(/[,;\t]/).map(c => c.trim());
      const nome = cols[0] ?? '';
      const numero = cols[1] ?? '';
      const nota = cols[2] ?? '';

      // Skip header row
      if (i === 0 && looksLikeHeader(nome, numero)) continue;

      if (nome && numero) leads.push({ nome, numero, nota, status: 'Sem contato' });
    }
    return leads;
  };

  const parseExcel = async (buffer: ArrayBuffer): Promise<ParsedLead[]> => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const ws = workbook.worksheets[0];
    if (!ws) return [];

    const leads: ParsedLead[] = [];
    ws.eachRow((row, _rowNumber) => {
      const nome = cleanValue(row.getCell(1).value);
      const numero = cleanValue(row.getCell(2).value);
      const nota = cleanValue(row.getCell(3).value);

      // Skip header row
      if (_rowNumber === 1 && looksLikeHeader(nome, numero)) return;

      if (nome && numero) leads.push({ nome, numero, nota, status: 'Sem contato' });
    });
    return leads;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let leads: ParsedLead[] = [];
      const ext = file.name.toLowerCase();

      if (ext.endsWith('.csv') || ext.endsWith('.txt')) {
        const text = await file.text();
        leads = parseCSV(text);
      } else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        leads = await parseExcel(buffer);
      } else {
        toast.error('Formato não suportado. Use .xlsx, .xls ou .csv');
        return;
      }

      if (leads.length === 0) {
        toast.error('Nenhum lead encontrado. Verifique se o arquivo tem dados nas colunas 1 (nome) e 2 (número).');
        return;
      }

      setAllLeads(leads);
      setStartRow(1);
      setDialogOpen(true);
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Erro ao ler o arquivo. Verifique o formato.');
    }

    if (inputRef.current) inputRef.current.value = '';
  };

  const confirmImport = () => {
    const sliced = allLeads.slice(startRow - 1);
    if (sliced.length === 0) {
      toast.error('Nenhum lead a partir dessa linha.');
      return;
    }
    setProgress({ done: 0, total: sliced.length });
    bulkAdd.mutate(
      { leads: sliced, onProgress: (done, total) => setProgress({ done, total }) },
      {
        onSettled: () => {
          setProgress(null);
          setDialogOpen(false);
          setAllLeads([]);
        },
      },
    );
  };

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      <Button variant="outline" size="icon" onClick={() => inputRef.current?.click()} disabled={bulkAdd.isPending} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
        <Upload className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">Importar</span>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!bulkAdd.isPending) setDialogOpen(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Importar Leads</DialogTitle>
            <DialogDescription>
              {allLeads.length} leads encontrados no arquivo.
            </DialogDescription>
          </DialogHeader>
          {progress ? (
            <div className="space-y-2">
              <Progress value={pct} />
              <p className="text-sm text-muted-foreground text-center">
                {progress.done.toLocaleString('pt-BR')} de {progress.total.toLocaleString('pt-BR')} leads ({pct}%)
              </p>
              <p className="text-xs text-muted-foreground text-center">Não feche esta janela até concluir.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="startRow">Começar a partir do lead nº</Label>
                <Input
                  id="startRow"
                  type="number"
                  min={1}
                  max={allLeads.length}
                  value={startRow}
                  onChange={(e) => setStartRow(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <p className="text-xs text-muted-foreground">
                  Serão importados {Math.max(0, allLeads.length - startRow + 1)} leads (do {startRow}º ao {allLeads.length}º)
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={bulkAdd.isPending}>Cancelar</Button>
            <Button onClick={confirmImport} disabled={bulkAdd.isPending}>
              {bulkAdd.isPending ? `Importando... ${pct}%` : `Importar ${Math.max(0, allLeads.length - startRow + 1)} leads`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

