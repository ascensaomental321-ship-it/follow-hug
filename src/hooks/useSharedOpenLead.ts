import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RemoteStatusChange {
  leadId: string;
  status: string;
  /** timestamp para forçar reação mesmo se o mesmo status vier duas vezes */
  at: number;
}

/**
 * Sincroniza qual card está aberto entre todos os dispositivos.
 * Quem abrir o site vê o mesmo card aberto; ao fechar, fecha pra todos.
 * Também espelha a troca de status (com a animação) em tempo real.
 */
export function useSharedOpenLead(ambiente: string) {
  const [openLeadId, setOpenLeadIdState] = useState<string | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<RemoteStatusChange | null>(null);
  const [remoteNota, setRemoteNota] = useState<{ leadId: string; nota: string; at: number } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentRef = useRef<string | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`crm-open-card-${ambiente}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on('broadcast', { event: 'open-card' }, ({ payload }) => {
        const id = (payload as { leadId: string | null })?.leadId ?? null;
        currentRef.current = id;
        setOpenLeadIdState(id);
      })
      // troca de status feita em outro dispositivo → espelha a animação aqui
      .on('broadcast', { event: 'status-change' }, ({ payload }) => {
        const p = payload as { leadId?: string; status?: string };
        if (p?.leadId && p?.status) {
          setRemoteStatus({ leadId: p.leadId, status: p.status, at: Date.now() });
        }
      })
      // nota digitada em outro dispositivo → espelha em tempo real
      .on('broadcast', { event: 'nota-change' }, ({ payload }) => {
        const p = payload as { leadId?: string; nota?: string };
        if (p?.leadId && typeof p.nota === 'string') {
          setRemoteNota({ leadId: p.leadId, nota: p.nota, at: Date.now() });
        }
      })
      // quem chega depois pergunta qual card está aberto
      .on('broadcast', { event: 'who-open' }, () => {
        if (currentRef.current) {
          channel.send({ type: 'broadcast', event: 'open-card', payload: { leadId: currentRef.current } });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: 'broadcast', event: 'who-open', payload: {} });
        }
      });
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [ambiente]);

  const setOpenLeadId = (leadId: string | null) => {
    currentRef.current = leadId;
    setOpenLeadIdState(leadId);
    channelRef.current?.send({ type: 'broadcast', event: 'open-card', payload: { leadId } });
  };

  const broadcastStatusChange = (leadId: string, status: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'status-change', payload: { leadId, status } });
  };

  const broadcastNota = (leadId: string, nota: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'nota-change', payload: { leadId, nota } });
  };

  return { openLeadId, setOpenLeadId, remoteStatus, broadcastStatusChange, remoteNota, broadcastNota };
}
