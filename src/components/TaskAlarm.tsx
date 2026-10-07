import { useEffect, useState } from 'react';
import { useAllTasks } from '@/hooks/useLeadTasks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Alarm = { id: string; leadId: string; titulo: string; nome: string; numero: string; hora: string };

/** Agenda alarmes no próprio navegador (sem custo de servidor) para cada tarefa pendente. */
export function TaskAlarm() {
  const { data: tasks } = useAllTasks();
  const [alarms, setAlarms] = useState<Alarm[]>([]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }, []);

  useEffect(() => {
    if (!tasks) return;
    const timers: number[] = [];
    const now = Date.now();
    for (const t of tasks) {
      const delay = new Date(t.data_hora).getTime() - now;
      if (delay <= 0 || delay > 2147483647) continue;
      timers.push(window.setTimeout(() => {
        const a: Alarm = {
          id: t.id, leadId: t.lead_id, titulo: t.titulo, nome: t.leads?.nome ?? 'Lead', numero: t.leads?.numero ?? '',
          hora: new Date(t.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
        setAlarms((prev) => [...prev, a]);
        try {
          if ('Notification' in window && Notification.permission === 'granted')
            new Notification(`⏰ ${a.titulo}`, { body: `${a.nome} — ${a.hora}` });
        } catch { /* ignore */ }
      }, delay));
    }
    return () => timers.forEach(clearTimeout);
  }, [tasks]);

  const current = alarms[0];
  const close = () => setAlarms((p) => p.slice(1));

  return (
    <Dialog open={!!current} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>⏰ {current?.titulo}</DialogTitle>
          <DialogDescription>
            {current?.nome} {current?.numero && `· ${current.numero}`} · {current?.hora}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          {current?.numero && (
            <Button asChild variant="outline"><a href={`tel:${current.numero.replace(/\D/g, '')}`}>Ligar</a></Button>
          )}
          {current?.leadId && (
            <Button variant="outline" onClick={() => { window.open(`/tarefa/${current.leadId}`, '_blank'); close(); }}>
              Abrir card
            </Button>
          )}
          <Button onClick={close}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
