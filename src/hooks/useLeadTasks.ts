import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LeadTask {
  id: string;
  lead_id: string;
  titulo: string;
  data_hora: string;
  concluida: boolean;
  created_at: string;
}

export function useLeadTasks(leadId?: string) {
  return useQuery({
    queryKey: ['lead_tasks', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_tasks')
        .select('*')
        .eq('lead_id', leadId!)
        .order('data_hora', { ascending: true });
      if (error) throw error;
      return data as LeadTask[];
    },
  });
}

export function useAllTasks() {
  return useQuery({
    queryKey: ['all_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_tasks')
        .select('*, leads(nome, numero)')
        .eq('concluida', false)
        .order('data_hora', { ascending: true });
      if (error) throw error;
      return data as (LeadTask & { leads: { nome: string; numero: string } })[];
    },
  });
}

export function useAddTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: { lead_id: string; titulo: string; data_hora: string }) => {
      const { data, error } = await supabase.from('lead_tasks').insert(task).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lead_tasks', vars.lead_id] });
      qc.invalidateQueries({ queryKey: ['all_tasks'] });
      toast.success('Tarefa criada!');
    },
    onError: () => toast.error('Erro ao criar tarefa'),
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, concluida, lead_id }: { id: string; concluida: boolean; lead_id: string }) => {
      const { error } = await supabase.from('lead_tasks').update({ concluida }).eq('id', id);
      if (error) throw error;
      return { lead_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['lead_tasks', data.lead_id] });
      qc.invalidateQueries({ queryKey: ['all_tasks'] });
    },
    onError: () => toast.error('Erro ao atualizar tarefa'),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, lead_id }: { id: string; lead_id: string }) => {
      const { error } = await supabase.from('lead_tasks').delete().eq('id', id);
      if (error) throw error;
      return { lead_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['lead_tasks', data.lead_id] });
      qc.invalidateQueries({ queryKey: ['all_tasks'] });
      toast.success('Tarefa removida!');
    },
    onError: () => toast.error('Erro ao remover tarefa'),
  });
}
