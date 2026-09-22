import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const COUNTED_STATUSES = ['Ligação feita', 'Ligação dois feita', 'Religar', 'WhatsApp feito'];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useTodayActivity() {
  return useQuery({
    queryKey: ['today-activity'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('lead_status_history')
        .select('id', { count: 'exact', head: true })
        .in('new_status', COUNTED_STATUSES)
        .gte('changed_at', startOfToday());
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });
}
