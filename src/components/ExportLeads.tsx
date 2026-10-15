import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import type { Lead } from '@/hooks/useLeads';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const slug = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase() || 'todos';

export function ExportLeads({ leads, tab }: { leads: Lead[]; tab: string }) {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (leads.length === 0) {
      toast.error('Nenhum lead para exportar');
      return;
    }
    setLoading(true);
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Leads');
      ws.addRow(['Nome', 'Número', 'Nota']);
      for (const l of leads) {
        ws.addRow([l.nome ?? '', l.numero ?? '', l.nota ?? '']);
      }
      ws.getColumn(1).width = 32;
      ws.getColumn(2).width = 18;
      ws.getColumn(3).width = 50;

      const buffer = await wb.xlsx.writeBuffer();
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `leads-${slug(tab)}-${date}.xlsx`,
      );
      toast.success(`${leads.length} leads exportados`);
    } catch {
      toast.error('Erro ao exportar leads');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="icon" onClick={run} disabled={loading} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 sm:mr-1" />}
      <span className="hidden sm:inline">Exportar</span>
    </Button>
  );
}
