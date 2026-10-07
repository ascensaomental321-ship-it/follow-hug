import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeadFormDialog } from '@/components/LeadFormDialog';
import type { Lead } from '@/hooks/useLeads';

/** Aba temporária só para tarefas: abre o card do lead sem sincronizar com outros dispositivos. */
const TarefaLead = () => {
  const { id } = useParams();
  const { data: lead } = useQuery({
    queryKey: ['lead_single', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as Lead;
    },
  });

  return (
    <div className="min-h-screen bg-background p-4">
      <p className="text-center text-sm text-muted-foreground">Aba de tarefa — pode fechar quando terminar.</p>
      {lead && <LeadFormDialog open onOpenChange={(o) => { if (!o) window.close(); }} lead={lead} />}
    </div>
  );
};

export default TarefaLead;
