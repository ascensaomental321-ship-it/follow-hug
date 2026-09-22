import { useState, useMemo, useEffect, useRef } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

import { Plus, Send, Loader2, Search, X, ClipboardList, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadCard } from '@/components/LeadCard';
import { LeadFormDialog } from '@/components/LeadFormDialog';
import { ImportSpreadsheet } from '@/components/ImportSpreadsheet';
import { PasteLeads } from '@/components/PasteLeads';
import { BrandMark } from '@/components/BrandMark';
import { useLeads, useLeadsRealtime, type Lead } from '@/hooks/useLeads';
import { useSharedOpenLead } from '@/hooks/useSharedOpenLead';
import { useAllTasks } from '@/hooks/useLeadTasks';
import { useTodayActivity } from '@/hooks/useTodayActivity';
import { LEAD_STATUSES } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { TOOL_LINKS } from '@/lib/prospectTools';
import { useEnvironment } from '@/hooks/useEnvironment';
import { DeleteAllLeads } from '@/components/DeleteAllLeads';
import { TodayCounter } from '@/components/TodayCounter';

const ALL_TAB = 'Todos';

const Index = () => {
  const { ambiente, toggle } = useEnvironment();
  const { data: leads, isLoading } = useLeads();
  useLeadsRealtime();
  const { openLeadId, setOpenLeadId, remoteStatus, broadcastStatusChange, remoteNota, broadcastNota } =
    useSharedOpenLead(ambiente);
  const { data: tasks } = useAllTasks();
  const { data: todayActivity } = useTodayActivity();
  const [activeTab, setActiveTab] = useState(ALL_TAB);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dueSoonCount = useMemo(() => {
    if (!tasks) return 0;
    const limit = new Date();
    limit.setDate(limit.getDate() + 1);
    limit.setHours(23, 59, 59, 999);
    return tasks.filter((t) => new Date(t.data_hora) <= limit).length;
  }, [tasks]);

  const statusCounts = useMemo(() => {
    if (!leads) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const l of leads) {
      counts[l.status] = (counts[l.status] || 0) + 1;
    }
    return counts;
  }, [leads]);

  const duplicateIds = useMemo(() => {
    const dups = new Set<string>();
    if (!leads) return dups;
    const byName = new Map<string, string[]>();
    const byNumber = new Map<string, string[]>();
    const norm = (s: string) => s.trim().toLowerCase();
    const normNum = (s: string) => s.replace(/\D/g, '');
    for (const l of leads) {
      const n = norm(l.nome);
      const num = normNum(l.numero);
      if (n) byName.set(n, [...(byName.get(n) ?? []), l.id]);
      if (num) byNumber.set(num, [...(byNumber.get(num) ?? []), l.id]);
    }
    for (const ids of byName.values()) if (ids.length > 1) ids.forEach(i => dups.add(i));
    for (const ids of byNumber.values()) if (ids.length > 1) ids.forEach(i => dups.add(i));
    return dups;
  }, [leads]);


  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    let result = leads;
    if (activeTab !== ALL_TAB) {
      result = result.filter((l) => l.status === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) => l.nome.toLowerCase().includes(q) || l.numero.includes(q)
      );
    }
    return result;
  }, [leads, activeTab, searchQuery]);

  const listRef = useRef<HTMLDivElement>(null);
  const virtualizer = useWindowVirtualizer({
    count: filteredLeads.length,
    estimateSize: () => 108,
    overscan: 8,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });


  // Ordem da lista no momento em que o card foi aberto (para avançar ao próximo)
  const orderRef = useRef<string[]>([]);

  const openNew = () => { setSelectedLead(null); setDialogOpen(true); };
  const openEdit = (lead: Lead) => {
    orderRef.current = filteredLeads.map((l) => l.id);
    setOpenLeadId(lead.id);
  };

  /** Depois de trocar o status, abre o próximo card da lista automaticamente. */
  const advanceToNext = (currentId: string) => {
    let order = orderRef.current;
    if (!order.includes(currentId)) {
      order = filteredLeads.map((l) => l.id);
      if (!order.includes(currentId)) order = [currentId, ...order];
      orderRef.current = order;
    }
    const idx = order.indexOf(currentId);
    const nextId = order.slice(idx + 1).find((id) => {
      const l = leads?.find((x) => x.id === id);
      if (!l) return false;
      if (activeTab !== ALL_TAB && l.status !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!l.nome.toLowerCase().includes(q) && !l.numero.includes(q)) return false;
      }
      return true;
    });
    if (nextId) {
      setOpenLeadId(nextId);
    } else {
      toast.info('Fim da lista — toque em Fechar para sair');
    }
  };

  // Card aberto é compartilhado: abre/fecha em todos os dispositivos
  useEffect(() => {
    if (openLeadId) {
      const lead = leads?.find((l) => l.id === openLeadId);
      if (lead) { setSelectedLead(lead); setDialogOpen(true); }
    } else if (selectedLead) {
      setDialogOpen(false);
      setSelectedLead(null);
    }
  }, [openLeadId, leads]);

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open && selectedLead) setOpenLeadId(null);
  };

  const sendReport = async () => {
    setReportLoading(true);
    try {
      const res = await supabase.functions.invoke('daily-report');
      if (res.error) throw res.error;
      toast.success('Relatório enviado para ntfy!');
    } catch {
      toast.error('Erro ao gerar relatório');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="min-w-0 shrink truncate"><BrandMark /></div>
          <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(''); }}>
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" asChild>
              <Link to="/dashboard"><BarChart3 className="h-4 w-4" /></Link>
            </Button>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9" asChild>
              <Link to="/tarefas">
                <ClipboardList className="h-4 w-4" />
                {dueSoonCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse">
                    {dueSoonCount}
                  </span>
                )}
              </Link>
            </Button>
            <ImportSpreadsheet />
            <PasteLeads />
            <Button variant="outline" size="icon" onClick={sendReport} disabled={reportLoading} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
              {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 sm:mr-1" />}
              <span className="hidden sm:inline">Relatório</span>
            </Button>
            <Button size="icon" onClick={openNew} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
              <Plus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Lead</span>
            </Button>
          </div>
        </div>
        {searchOpen && (
          <div className="mx-auto max-w-4xl px-3 sm:px-4 pb-2.5">
            <Input
              placeholder="Buscar por nome ou número..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="h-9"
            />
          </div>
        )}
        <div className="mx-auto max-w-4xl px-3 sm:px-4 pb-2 flex items-center gap-1.5 overflow-x-auto">
          <a href={TOOL_LINKS.buscalink} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap rounded-full border border-prospect/40 bg-prospect/10 px-2.5 py-1 text-[11px] font-medium text-prospect hover:bg-prospect/20 transition-colors">Buscalink</a>
          <a href={TOOL_LINKS.buscaSocio} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap rounded-full border border-prospect/40 bg-prospect/10 px-2.5 py-1 text-[11px] font-medium text-prospect hover:bg-prospect/20 transition-colors">Busca Sócio</a>
          <a href={TOOL_LINKS.script} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap rounded-full border border-prospect/40 bg-prospect/10 px-2.5 py-1 text-[11px] font-medium text-prospect hover:bg-prospect/20 transition-colors">Script</a>
          <button
            type="button"
            onClick={toggle}
            className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              ambiente === 'teste'
                ? 'border-foreground bg-background text-foreground hover:bg-muted'
                : 'border-foreground bg-foreground text-background hover:opacity-90'
            }`}
          >
            {ambiente === 'teste' ? 'Real' : 'Teste'}
          </button>
          <DeleteAllLeads />
        </div>
        {ambiente === 'teste' && (
          <div className="mx-auto max-w-4xl px-3 sm:px-4 pb-2">
            <p className="rounded-md border border-border bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground">
              Ambiente de testes — totalmente separado do CRM real. Os leads criados aqui ficam salvos até você removê-los.
            </p>
          </div>
        )}
      </header>

      <div className="mx-auto max-w-4xl px-3 sm:px-4 pt-3 sm:pt-4">
        <TodayCounter count={todayActivity ?? 0} paused={dialogOpen} />
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto min-w-full">
              <TabsTrigger value={ALL_TAB} className="text-xs sm:text-sm px-2.5 sm:px-3 gap-1.5">
                Todos
                {(leads?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] font-bold">{leads?.length}</Badge>
                )}
              </TabsTrigger>
              {LEAD_STATUSES.map((s) => (
                <TabsTrigger key={s} value={s} className="text-xs sm:text-sm whitespace-nowrap px-2.5 sm:px-3 gap-1.5">
                  {s}
                  {(statusCounts[s] ?? 0) > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] font-bold">{statusCounts[s]}</Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Tabs>
      </div>

      <main className="mx-auto max-w-4xl px-3 sm:px-4 py-3 sm:py-4">
        {isLoading ? (
          <div className="space-y-2.5 sm:space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 sm:h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 sm:py-16 text-muted-foreground">
            <p className="text-base sm:text-lg">Nenhum lead encontrado</p>
            <p className="text-xs sm:text-sm mt-1">{searchQuery ? 'Tente outro termo de busca' : 'Clique em "+" para adicionar'}</p>
          </div>
        ) : (
          <div ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const lead = filteredLeads[vi.index];
              return (
                <div
                  key={lead.id}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 top-0 w-full pb-2.5 sm:pb-3"
                  style={{ transform: `translateY(${vi.start - virtualizer.options.scrollMargin}px)`, transition: 'transform 220ms ease' }}
                >
                  {/* a key com o status faz o card reanimar quando ele muda de lugar */}
                  <div key={lead.status} className="animate-card-in">
                    <LeadCard lead={lead} onClick={openEdit} isDuplicate={duplicateIds.has(lead.id)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>


      <LeadFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        lead={selectedLead}
        remoteStatus={remoteStatus}
        onStatusChanged={broadcastStatusChange}
        remoteNota={remoteNota}
        onNotaChanged={broadcastNota}
        onAdvanceNext={advanceToNext}
      />
    </div>
  );
};

export default Index;
