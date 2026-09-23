import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, StickyNote, AlertTriangle, Lightbulb, FileText, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openProspectTools, openBuscalinkTool, openScriptTool } from '@/lib/prospectTools';
import { toast } from 'sonner';
import { STATUS_COLORS, type LeadStatus } from '@/lib/constants';
import { Linkify } from '@/components/Linkify';
import type { Lead } from '@/hooks/useLeads';

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  isDuplicate?: boolean;
}

export function LeadCard({ lead, onClick, isDuplicate }: LeadCardProps) {
  const colorClass = STATUS_COLORS[lead.status as LeadStatus] ?? 'bg-muted';

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${isDuplicate ? 'border-destructive' : 'border-border'}`}
      onClick={() => onClick(lead)}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {isDuplicate && (
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" aria-label="Lead duplicado" />
            )}
            <h3 className="font-semibold text-foreground truncate min-w-0">{lead.nome}</h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge className={`${colorClass} text-white shrink-0 text-[11px]`}>
              {lead.status}
            </Badge>
          <Button
            type="button"
            size="icon"
            aria-label="Abrir Buscalink"
            title="Buscalink"
            className="h-8 w-8 shrink-0 bg-prospect text-prospect-foreground hover:bg-prospect/90 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              const copied = openBuscalinkTool(lead.nome);
              toast.success(
                copied
                  ? 'Nome copiado — Buscalink aberto'
                  : 'Buscalink aberto — copie o nome manualmente',
              );
            }}
          >
            <Palette className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            aria-label="Abrir ferramentas de prospecção"
            title="Buscalink + Script"
            className="h-8 w-8 shrink-0 bg-prospect text-prospect-foreground hover:bg-prospect/90 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              const copied = openProspectTools(lead.nome);
              toast.success(
                copied
                  ? 'Nome copiado — no Buscalink dê Ctrl+V (ou toque e "Colar")'
                  : 'Ferramentas abertas — copie o nome manualmente',
              );
            }}
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            aria-label="Abrir Script"
            title="Script"
            className="h-8 w-8 shrink-0 bg-prospect text-prospect-foreground hover:bg-prospect/90 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              openScriptTool(lead.nome);
              toast.success('Script aberto com o nome da empresa');
            }}
          >
            <FileText className="h-4 w-4" />
          </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{lead.numero}</span>
          </div>
          {lead.nota && (
            <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <StickyNote className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p className="line-clamp-2 whitespace-pre-wrap break-words">
                <Linkify text={lead.nota} />
              </p>
            </div>
          )}
        </div>
        {isDuplicate && (
          <p className="text-xs text-destructive font-medium flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Lead com nome ou número idêntico
          </p>
        )}
      </CardContent>
    </Card>
  );
}
