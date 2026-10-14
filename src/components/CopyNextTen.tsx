import { useState } from 'react';
import { Copy } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Lead } from '@/hooks/useLeads';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function CopyNextTen({ leads }: { leads: Lead[] }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const next = leads.slice(0, 10);

  const run = async () => {
    const text = next.map((l, i) => `${i + 1}. ${l.numero} - ${l.nome}`).join('\n');
    const copied = await copyText(text);
    const ids = next.map((l) => l.id);
    const { error } = await supabase.from('leads').update({ status: 'WhatsApp feito' }).in('id', ids);
    if (error) { toast.error('Erro ao atualizar status'); return; }
    await supabase.from('lead_status_history').insert(
      next.map((l) => ({ lead_id: l.id, old_status: l.status, new_status: 'WhatsApp feito' })),
    );
    qc.invalidateQueries({ queryKey: ['leads'] });
    qc.invalidateQueries({ queryKey: ['today-activity'] });
    if (copied) toast.success(`${next.length} leads copiados e marcados como WhatsApp feito`);
    else toast.error('Status atualizado, mas não deu pra copiar');
  };

  if (next.length === 0) return null;

  return (
    <>
      <Button className="w-full mt-3 gap-2" onClick={() => setOpen(true)}>
        <Copy className="h-4 w-4" /> Copiar próximos {next.length}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copiar {next.length} leads?</AlertDialogTitle>
            <AlertDialogDescription>
              Os próximos {next.length} leads vão ser copiados (número e nome) e marcados como "WhatsApp feito".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={run}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
