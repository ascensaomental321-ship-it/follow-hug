import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandMark } from '@/components/BrandMark';
import { useLeads } from '@/hooks/useLeads';
import { LEAD_STATUSES, STATUS_COLORS, type LeadStatus } from '@/lib/constants';
import { ArrowLeft } from 'lucide-react';

const PRESETS = [
  { value: 'mes-atual', label: 'Mês atual' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '15', label: 'Últimos 15 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'todos', label: 'Todos os leads' },
];

const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

const Dashboard = () => {
  const { data: leads, isLoading } = useLeads();
  const [period, setPeriod] = useState('mes-atual');

  const months = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads ?? []) {
      const d = new Date(l.created_at);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return Array.from(set).sort().reverse();
  }, [leads]);

  const filtered = useMemo(() => {
    if (!leads) return [];
    if (period === 'todos') return leads;
    if (period.startsWith('mes:')) {
      const key = period.slice(4);
      return leads.filter((l) => {
        const d = new Date(l.created_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === key;
      });
    }
    if (period === 'mes-atual') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const res = leads.filter((l) => new Date(l.created_at) >= start);
      return res.length ? res : leads;
    }
    const days = Number(period);
    const start = new Date();
    start.setDate(start.getDate() - days);
    const res = leads.filter((l) => new Date(l.created_at) >= start);
    return res.length ? res : leads;
  }, [leads, period]);

  const usingFallback =
    !!leads && leads.length > 0 && filtered.length === leads.length &&
    period !== 'todos' && !period.startsWith('mes:');

  const total = filtered.length;

  const rows = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of filtered) counts[l.status] = (counts[l.status] || 0) + 1;
    return LEAD_STATUSES.map((s) => ({
      status: s,
      count: counts[s] ?? 0,
      pct: total ? (counts[s] ?? 0) / total * 100 : 0,
    })).sort((a, b) => b.count - a.count);
  }, [filtered, total]);

  const trabalhados = filtered.filter((l) => l.status !== 'Sem contato').length;
  const fechados = filtered.filter((l) => l.status === 'Fechado').length;

  const fmt = (n: number) => (n % 1 === 0 ? n.toFixed(0) : n.toFixed(1));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3">
          <BrandMark />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Leads</span></Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-3 sm:px-4 py-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-bold text-foreground">Dashboard</h2>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[190px] h-9 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
              {months.map((m) => (
                <SelectItem key={m} value={`mes:${m}`} className="capitalize">{monthLabel(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
        ) : total === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-base">Nenhum lead nesse período</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: 'Leads', value: String(total) },
                { label: 'Trabalhados', value: `${fmt(total ? trabalhados / total * 100 : 0)}%` },
                { label: 'Fechados', value: `${fmt(total ? fechados / total * 100 : 0)}%` },
              ].map((c) => (
                <Card key={c.label} className="border-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{c.value}</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">{c.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border">
              <CardContent className="p-3 sm:p-4 space-y-3">
                {rows.map((r) => (
                  <div key={r.status} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                      <span className="font-medium text-foreground truncate">{r.status}</span>
                      <span className="text-muted-foreground shrink-0">
                        {r.count} • <span className="font-bold text-foreground">{fmt(r.pct)}%</span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${STATUS_COLORS[r.status as LeadStatus]}`}
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <p className="text-[11px] text-muted-foreground text-center">
              {usingFallback
                ? 'Sem leads criados nesse período — mostrando todos os leads. Cada lead conta uma única vez, pelo status atual.'
                : 'Cada lead é contado uma única vez, pelo status atual.'}
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;