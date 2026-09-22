export const LEAD_STATUSES = [
  'Sem contato',
  'Ligação feita',
  'Ligação dois feita',
  'Religar',
  'WhatsApp feito',
  'Interesse identificado',
  'Reunião agendada',
  'Fechado',
  'Descartado',
] as const;

export type LeadStatus = typeof LEAD_STATUSES[number];

export const STATUS_COLORS: Record<LeadStatus, string> = {
  'Sem contato': 'bg-[hsl(var(--status-sem-contato))]',
  'Ligação feita': 'bg-[hsl(var(--status-ligacao-feita))]',
  'Ligação dois feita': 'bg-[hsl(var(--status-ligacao-dois-feita))]',
  'Religar': 'bg-[hsl(var(--status-religar))]',
  'WhatsApp feito': 'bg-[hsl(var(--status-whatsapp-feito))]',
  'Interesse identificado': 'bg-[hsl(var(--status-interesse))]',
  'Reunião agendada': 'bg-[hsl(var(--status-reuniao))]',
  'Fechado': 'bg-[hsl(var(--status-fechado))]',
  'Descartado': 'bg-[hsl(var(--status-descartado))]',
};
