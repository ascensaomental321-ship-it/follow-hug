import { useMemo } from 'react';
import { useAllTasks, useToggleTask, useDeleteTask } from '@/hooks/useLeadTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2, CalendarClock, BellRing } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, isTomorrow, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Tarefas = () => {
  const { data: tasks, isLoading } = useAllTasks();
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTask();

  const { overdue, today, tomorrow, future } = useMemo(() => {
    if (!tasks) return { overdue: [], today: [], tomorrow: [], future: [] };
    const now = startOfDay(new Date());
    const o: typeof tasks = [];
    const t: typeof tasks = [];
    const tm: typeof tasks = [];
    const f: typeof tasks = [];
    for (const task of tasks) {
      const d = new Date(task.data_hora);
      if (isToday(d)) t.push(task);
      else if (isTomorrow(d)) tm.push(task);
      else if (isBefore(d, now)) o.push(task);
      else f.push(task);
    }
    return { overdue: o, today: t, tomorrow: tm, future: f };
  }, [tasks]);

  const renderTask = (task: typeof tasks extends (infer T)[] ? T : never) => (
    <Card key={task.id} className="border-border">
      <CardContent className="p-3 flex items-start gap-3">
        <Checkbox
          checked={task.concluida}
          onCheckedChange={(checked) =>
            toggleTask.mutate({ id: task.id, concluida: !!checked, lead_id: task.lead_id })
          }
          className="mt-1"
        />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-medium text-sm text-foreground">{task.titulo}</p>
          <p className="text-xs text-muted-foreground truncate">
            {task.leads?.nome} • {task.leads?.numero}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="h-3 w-3" />
            {format(new Date(task.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive shrink-0"
          onClick={() => deleteTask.mutate({ id: task.id, lead_id: task.lead_id })}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );

  const Section = ({ title, items, className }: { title: string; items: typeof tasks; className?: string }) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h2 className={`text-sm font-bold ${className ?? 'text-foreground'}`}>{title} ({items.length})</h2>
        {items.map(renderTask)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            CRM Pro <span className="text-primary italic font-extrabold">Zenter</span>
          </h1>
        </div>
      </header>

      <nav className="mx-auto max-w-4xl px-3 sm:px-4 pt-3 flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href="/">← Leads</a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="/dashboard">Dashboard</a>
        </Button>
        <Button variant="default" size="sm" disabled>
          Tarefas
        </Button>
      </nav>

      <main className="mx-auto max-w-4xl px-3 sm:px-4 py-3 space-y-4">
        {tomorrow.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-accent p-3 text-sm text-accent-foreground">
            <BellRing className="h-4 w-4 shrink-0" />
            <span>
              Você tem {tomorrow.length} tarefa{tomorrow.length > 1 ? 's' : ''} amanhã — dá uma olhada!
            </span>
          </div>
        )}
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
        ) : !tasks || tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-base">Nenhuma tarefa pendente</p>
            <p className="text-sm mt-1">Adicione tarefas dentro do card de cada lead</p>
          </div>
        ) : (
          <>
            <Section title="Atrasadas" items={overdue} className="text-destructive" />
            <Section title="Hoje" items={today} />
            <Section title="Amanhã" items={tomorrow} className="text-primary" />
            <Section title="Próximos dias" items={future} />
          </>
        )}
      </main>
    </div>
  );
};

export default Tarefas;
