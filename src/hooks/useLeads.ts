import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useEnvironment } from '@/hooks/useEnvironment';

export type Lead = Tables<'leads'>;

const PAGE = 1000;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function useLeads() {
  const { ambiente } = useEnvironment();
  return useQuery({
    queryKey: ['leads', ambiente],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      // PostgREST devolve no máximo 1000 linhas por requisição — paginamos até trazer tudo
      const all: Lead[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .eq('ambiente', ambiente)
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all.push(...(data ?? []));
        if (!data || data.length < PAGE) break;
      }
      return all;
    },
  });
}


/** Mantém a lista sincronizada em tempo real entre todos os dispositivos. */
export function useLeadsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        qc.invalidateQueries({ queryKey: ['leads'] });
        qc.invalidateQueries({ queryKey: ['tasks'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}

export function useAddLead() {
  const qc = useQueryClient();
  const { ambiente } = useEnvironment();
  return useMutation({
    mutationFn: async (lead: TablesInsert<'leads'>) => {
      const { data, error } = await supabase.from('leads').insert({ ...lead, ambiente }).select().single();
      if (error) throw error;
      // Record initial status
      await supabase.from('lead_status_history').insert({
        lead_id: data.id,
        new_status: lead.status ?? 'Sem contato',
      });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead adicionado!'); },
    onError: () => toast.error('Erro ao adicionar lead'),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, oldStatus, ...updates }: { id: string; oldStatus?: string } & Partial<Lead>) => {
      const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
      if (error) throw error;
      // Record status change if status changed
      if (updates.status && updates.status !== oldStatus) {
        await supabase.from('lead_status_history').insert({
          lead_id: id,
          old_status: oldStatus ?? null,
          new_status: updates.status,
        });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['today-activity'] });
      toast.success('Lead atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar lead'),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead removido!'); },
    onError: () => toast.error('Erro ao remover lead'),
  });
}

export interface BulkAddArgs {
  leads: TablesInsert<'leads'>[];
  onProgress?: (done: number, total: number) => void;
}

const BATCH = 500;

export function useBulkAddLeads() {
  const qc = useQueryClient();
  const { ambiente } = useEnvironment();
  return useMutation({
    mutationFn: async (arg: BulkAddArgs | TablesInsert<'leads'>[]) => {
      const { leads, onProgress } = Array.isArray(arg) ? { leads: arg, onProgress: undefined } : arg;
      const total = leads.length;
      let done = 0;
      onProgress?.(0, total);

      // Inserimos em lotes para não estourar limites de payload/linhas
      for (const batch of chunk(leads.map(l => ({ ...l, ambiente })), BATCH)) {
        const { data, error } = await supabase.from('leads').insert(batch).select('id,status');
        if (error) throw error;
        const rows = data ?? [];
        if (rows.length) {
          await supabase
            .from('lead_status_history')
            .insert(rows.map(r => ({ lead_id: r.id, new_status: r.status ?? 'Sem contato' })));
        }
        done += batch.length;
        onProgress?.(done, total);
        // devolve o controle ao navegador para a UI não travar
        await new Promise(r => setTimeout(r, 0));
      }
      return total;
    },
    onSuccess: (count) => { qc.invalidateQueries({ queryKey: ['leads'] }); toast.success(`${count} leads importados!`); },
    onError: () => toast.error('Erro ao importar leads'),
  });
}

