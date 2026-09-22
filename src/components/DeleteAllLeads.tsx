import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEnvironment } from '@/hooks/useEnvironment';

/** Botão temporário de teste: some automaticamente depois desta data (72h após o publish). */
const EXPIRES_AT = new Date('2026-08-21T11:06:00Z');

export function DeleteAllLeads() {
  const { ambiente } = useEnvironment();
  const qc = useQueryClient();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [loading, setLoading] = useState(false);

  if (Date.now() > EXPIRES_AT.getTime()) return null;

  const wipe = async () => {
    setLoading(true);
    try {
      const { data: ids, error: selErr } = await supabase
        .from('leads')
        .select('id')
        .eq('ambiente', ambiente);
      if (selErr) throw selErr;
      const leadIds = (ids ?? []).map((l) => l.id);

      if (leadIds.length) {
        for (let i = 0; i < leadIds.length; i += 200) {
          const slice = leadIds.slice(i, i + 200);
          await supabase.from('lead_status_history').delete().in('lead_id', slice);
          await supabase.from('lead_tasks').delete().in('lead_id', slice);
          const { error } = await supabase.from('leads').delete().in('id', slice);
          if (error) throw error;
        }
      }
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`${leadIds.length} leads apagados`);
    } catch {
      toast.error('Erro ao apagar os leads');
    } finally {
      setLoading(false);
      setStep(0);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setStep(1)}
        className="whitespace-nowrap rounded-full border border-destructive bg-destructive px-2.5 py-1 text-[11px] font-semibold text-destructive-foreground transition-colors hover:opacity-90"
      >
        Apagar todos os leads
      </button>

      <AlertDialog open={step === 1} onOpenChange={(o) => !o && setStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar todos os leads?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove todos os leads do ambiente <strong>{ambiente}</strong>, junto com tarefas e
              histórico. Não dá pra desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); setStep(2); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={step === 2} onOpenChange={(o) => !o && setStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza mesmo?</AlertDialogTitle>
            <AlertDialogDescription>
              Última confirmação: todos os leads do ambiente {ambiente} serão apagados
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={(e) => { e.preventDefault(); wipe(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Apagando...' : 'Apagar tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
