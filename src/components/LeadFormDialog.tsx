import { useEffect, useState } from 'react';
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LinkifiedTextarea } from '@/components/LinkifiedTextarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LEAD_STATUSES } from '@/lib/constants';
import { useAddLead, useUpdateLead, useDeleteLead, type Lead } from '@/hooks/useLeads';
import { useLeadTasks, useAddTask, useToggleTask, useDeleteTask } from '@/hooks/useLeadTasks';
import { Trash2, Phone, MessageCircle, Copy, Plus, CalendarClock, Check, Lightbulb, FileText, Palette } from 'lucide-react';
import { openProspectTools, openScriptTool, openBuscalinkTool } from '@/lib/prospectTools';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_FEEDBACK: Record<string, { phrase: string; varName: string }> = {
  'Sem contato': { phrase: 'Recomeço poderoso!', varName: '--status-sem-contato' },
  'Ligação feita': { phrase: 'Boa tentativa!', varName: '--status-ligacao-feita' },
  'Ligação dois feita': { phrase: 'Mais uma tentativa! 💪', varName: '--status-ligacao-dois-feita' },
  'Religar': { phrase: 'Anotado, religar!', varName: '--status-religar' },
  'WhatsApp feito': { phrase: 'Mensagem enviada, bora!', varName: '--status-whatsapp-feito' },
  'Interesse identificado': { phrase: 'Tá esquentando! 🔥', varName: '--status-interesse' },
  'Reunião agendada': { phrase: 'Agora é fechar!', varName: '--status-reuniao' },
  'Fechado': { phrase: 'É venda! 🎉', varName: '--status-fechado' },
  'Descartado': { phrase: 'Bora pro próximo!', varName: '--status-descartado' },
};

const FOLLOW_UP_VARIANTS: Record<string, ((nome: string) => string)[]> = {
  '1': [
    (nome) => `Olá ${nome},\n\nVocê sabia que empresas que investem em tráfego pago de forma estratégica conseguem atrair clientes todos os dias de forma previsível? Com campanhas bem segmentadas no Google e Meta Ads, é possível colocar seu negócio na frente das pessoas certas, no momento certo. Vamos conversar sobre como isso funcionaria para o seu caso?\n\nEquipe Zenter`,
    (nome) => `Olá ${nome},\n\nHoje em dia, ter presença digital não é mais diferencial — é necessidade. Combinando tráfego pago com um site profissional e gestão de redes sociais, seu negócio ganha autoridade e gera resultados reais. Posso te mostrar como funciona na prática?\n\nEquipe Zenter`,
    (nome) => `Olá ${nome},\n\nMuitos negócios perdem vendas simplesmente porque não respondem rápido o suficiente. Com a automação de atendimento, você garante que cada lead receba atenção imediata, 24 horas por dia. Quer saber como integrar isso ao seu processo comercial?\n\nEquipe Zenter`,
  ],
  '2': [
    (nome) => `Olá ${nome},\n\nVocê já parou para pensar em quantos clientes visitam seu perfil nas redes sociais e não encontram um conteúdo que transmita confiança? A gestão profissional de social media transforma seus perfis em verdadeiras máquinas de conversão, com conteúdo estratégico e frequência consistente.\n\nEquipe Zenter`,
    (nome) => `Olá ${nome},\n\nUm site profissional e otimizado é a base de qualquer estratégia digital de sucesso. É onde o cliente valida que sua empresa é séria. Combinado com tráfego pago, o resultado é um fluxo constante de oportunidades qualificadas.\n\nEquipe Zenter`,
    (nome) => `Olá ${nome},\n\nA automação de atendimento não é só sobre chatbots — é sobre criar uma experiência fluida para o cliente, desde o primeiro contato até o fechamento. Empresas que automatizam o atendimento reduzem o tempo de resposta e aumentam drasticamente a taxa de conversão.\n\nEquipe Zenter`,
  ],
  '3': [
    (nome) => `Olá ${nome},\n\nO segredo de empresas que crescem rápido no digital é ter uma estrutura completa: tráfego pago trazendo visitantes, site convertendo em leads, redes sociais gerando autoridade e automação garantindo que nenhuma oportunidade escape. É exatamente isso que oferecemos.\n\nEquipe Zenter`,
    (nome) => `Olá ${nome},\n\nVocê já calculou quanto custa perder um cliente por atendimento lento? Com automação inteligente, cada lead é respondido em segundos, recebe as informações certas e é direcionado para o próximo passo. Isso muda completamente o jogo das suas vendas.\n\nEquipe Zenter`,
    (nome) => `Olá ${nome},\n\nSua empresa está nas redes sociais, mas será que está comunicando da forma certa? Conteúdo estratégico aliado a campanhas pagas cria um ciclo poderoso: atrai, engaja e converte. Vamos analisar juntos o potencial do seu negócio?\n\nEquipe Zenter`,
  ],
  '4': [
    (nome) => `Olá ${nome},\n\nEmpresas que integram tráfego pago + site + redes sociais + automação de atendimento conseguem escalar de forma previsível. Cada peça complementa a outra: o tráfego traz, o site converte, as redes engajam e a automação não deixa ninguém para trás.\n\nEquipe Zenter`,
    (nome) => `Olá ${nome},\n\nImagine ter um sistema onde cada real investido em anúncios volta multiplicado: landing pages otimizadas, redes sociais com conteúdo que gera confiança e um atendimento automatizado que qualifica e agenda reuniões sozinho. É isso que construímos para nossos clientes.\n\nEquipe Zenter`,
    (nome) => `Olá ${nome},\n\nO maior erro de quem investe em marketing digital é fazer as coisas de forma isolada. Anúncio sem site bom não converte. Rede social sem estratégia não engaja. Atendimento lento perde venda. Nossa abordagem integrada resolve tudo isso de uma vez.\n\nEquipe Zenter`,
  ],
  '5': [
    (nome) => `Olá ${nome},\n\nNossos clientes que mais crescem têm algo em comum: um ecossistema digital completo funcionando em harmonia. Tráfego pago gerando demanda, presença digital forte nas redes, site profissional e automação de atendimento garantindo que cada oportunidade seja aproveitada.\n\nEquipe Zenter`,
    (nome) => `Olá ${nome},\n\nResultados consistentes vêm de processos consistentes. Quando automatizamos o atendimento e integramos com suas campanhas de tráfego, criamos um sistema previsível de aquisição de clientes que funciona mesmo quando você não está online.\n\nEquipe Zenter`,
    (nome) => `Olá ${nome},\n\nCrescer no digital exige estratégia e execução impecável. Com gestão de tráfego pago, criação de sites, social media e automação de atendimento, entregamos tudo o que seu negócio precisa para dominar o mercado digital. Vamos conversar?\n\nEquipe Zenter`,
  ],
  'X': [
    (nome) => `Olá ${nome}! Reunião confirmada ✅ Nos vemos no horário combinado. Qualquer dúvida, só chamar!\n\nEquipe Zenter`,
    (nome) => `${nome}, tudo certo! Reunião agendada com sucesso. Te esperamos no horário marcado 🚀\n\nEquipe Zenter`,
    (nome) => `Perfeito ${nome}! Reunião marcada ✅ Preparamos tudo para uma conversa produtiva. Até lá!\n\nEquipe Zenter`,
  ],
  'Y': [
    (nome) => `Olá ${nome}! Estamos finalizando os preparativos para nossa reunião. Nos vemos em breve! 🚀\n\nEquipe Zenter`,
    (nome) => `${nome}, tudo pronto! Material separado para nossa conversa. Te aguardamos no horário combinado!\n\nEquipe Zenter`,
    (nome) => `Fala ${nome}! Reunião confirmada, estamos te esperando. Vai ser uma conversa muito boa! 💪\n\nEquipe Zenter`,
  ],
};

function getRandomMessage(key: string, nome: string): string {
  const variants = FOLLOW_UP_VARIANTS[key];
  const index = Math.floor(Math.random() * variants.length);
  return variants[index](nome);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  /** Troca de status feita em outro dispositivo — espelha a animação aqui. */
  remoteStatus?: { leadId: string; status: string; at: number } | null;
  /** Avisa os outros dispositivos que o status mudou aqui. */
  onStatusChanged?: (leadId: string, status: string) => void;
  /** Nota digitada em outro dispositivo. */
  remoteNota?: { leadId: string; nota: string; at: number } | null;
  /** Avisa os outros dispositivos que a nota mudou aqui. */
  onNotaChanged?: (leadId: string, nota: string) => void;
  /** Após trocar o status, abre automaticamente o próximo lead da lista. */
  onAdvanceNext?: (leadId: string) => void;
}

interface FormData {
  nome: string;
  numero: string;
  nota: string;
  status: string;
}

export function LeadFormDialog({ open, onOpenChange, lead, remoteStatus, onStatusChanged, remoteNota, onNotaChanged, onAdvanceNext }: Props) {
  const addTask = useAddTask();
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTask();
  const { data: leadTasks } = useLeadTasks(lead?.id);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDateTime, setTaskDateTime] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<string>('Ligação feita');

  const addLead = useAddLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const isEdit = !!lead;
  const qc = useQueryClient();

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: { nome: '', numero: '', nota: '', status: 'Sem contato' },
  });

  useEffect(() => {
    if (lead) {
      reset({ nome: lead.nome, numero: lead.numero, nota: lead.nota ?? '', status: lead.status });
    } else {
      reset({ nome: '', numero: '', nota: '', status: 'Sem contato' });
    }
    setShowSuccess(false);
  }, [lead, open, reset]);

  // Salva a nota automaticamente (sem precisar clicar em Salvar)
  const notaValue = watch('nota');
  const lastSavedNota = useRef<string | null>(null);
  const skipBroadcast = useRef(false);
  useEffect(() => {
    if (!open || !lead) return;
    if (lastSavedNota.current === null) lastSavedNota.current = lead.nota ?? '';
    const current = notaValue ?? '';
    if (current === (lastSavedNota.current ?? '')) return;
    // espelha a digitação nos outros dispositivos na hora
    if (skipBroadcast.current) {
      skipBroadcast.current = false;
    } else {
      onNotaChanged?.(lead.id, current);
    }
    const t = setTimeout(async () => {
      const { error } = await supabase.from('leads').update({ nota: current }).eq('id', lead.id);
      if (!error) {
        lastSavedNota.current = current;
        qc.invalidateQueries({ queryKey: ['leads'] });
      }
    }, 700);
    return () => clearTimeout(t);
  }, [notaValue, open, lead, qc]);

  useEffect(() => {
    lastSavedNota.current = lead ? (lead.nota ?? '') : null;
  }, [lead?.id, open]);

  // Nota alterada em outro dispositivo → atualiza o campo aqui em tempo real
  useEffect(() => {
    if (!remoteNota || !open || !lead || remoteNota.leadId !== lead.id) return;
    if ((watch('nota') ?? '') === remoteNota.nota) return;
    skipBroadcast.current = true;
    lastSavedNota.current = remoteNota.nota;
    setValue('nota', remoteNota.nota);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteNota?.at]);

  const onSubmit = (data: FormData) => {
    if (isEdit && lead) {
      updateLead.mutate({ id: lead.id, oldStatus: lead.status, ...data }, { onSuccess: () => onOpenChange(false) });
    } else {
      addLead.mutate(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  const handleDelete = () => {
    if (lead) {
      deleteLead.mutate(lead.id, { onSuccess: () => onOpenChange(false) });
    }
  };

  const handleFollowUp = (key: string) => {
    const numero = watch('numero').replace(/\D/g, '');
    const nome = watch('nome');
    const message = getRandomMessage(key, nome);
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const statusValue = watch('status');

  const handleStatusChange = (newStatus: string) => {
    setValue('status', newStatus);
    if (isEdit && lead && newStatus !== lead.status) {
      setFeedbackStatus(newStatus);
      setShowSuccess(true);
      onStatusChanged?.(lead.id, newStatus);
      setTimeout(() => {
        updateLead.mutate(
          { id: lead.id, oldStatus: lead.status, nome: watch('nome'), numero: watch('numero'), nota: watch('nota'), status: newStatus },
          {
            onSuccess: () => {
              setShowSuccess(false);
              if (onAdvanceNext) onAdvanceNext(lead.id);
              else onOpenChange(false);
            },
          }
        );
      }, 1100);
    }
  };

  // Espelha a animação quando o status é trocado em outro dispositivo
  useEffect(() => {
    if (!remoteStatus || !open || !lead || remoteStatus.leadId !== lead.id) return;
    setValue('status', remoteStatus.status);
    setFeedbackStatus(remoteStatus.status);
    setShowSuccess(true);
    const t = setTimeout(() => setShowSuccess(false), 1400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteStatus?.at]);

  const feedback = STATUS_FEEDBACK[feedbackStatus] ?? STATUS_FEEDBACK['Ligação feita'];
  const accent = `hsl(var(${feedback.varName}))`;
  const accentSoft = `hsl(var(${feedback.varName}) / 0.3)`;
  const accentSofter = `hsl(var(${feedback.varName}) / 0.2)`;
  const accentRing = `hsl(var(${feedback.varName}) / 0.25)`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => { if (isEdit) e.preventDefault(); }}
      >
        {showSuccess && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md animate-fade-in rounded-lg overflow-hidden">
            <div className="relative flex flex-col items-center gap-4">
              {/* expanding rings */}
              <span className="absolute top-10 h-24 w-24 rounded-full animate-ring-pulse" style={{ backgroundColor: accentSoft }} />
              <span className="absolute top-10 h-24 w-24 rounded-full animate-ring-pulse" style={{ backgroundColor: accentSofter, animationDelay: '150ms' }} />
              {/* confetti dots */}
              {[
                { tx: '-70px', ty: '-60px' },
                { tx: '70px', ty: '-55px' },
                { tx: '-60px', ty: '50px' },
                { tx: '65px', ty: '55px' },
                { tx: '0px', ty: '-80px' },
                { tx: '0px', ty: '75px' },
              ].map((d, i) => (
                <span
                  key={i}
                  className="absolute top-16 h-2 w-2 rounded-full animate-confetti"
                  style={{ backgroundColor: accent, ['--tx' as string]: d.tx, ['--ty' as string]: d.ty, animationDelay: `${i * 40}ms` } as React.CSSProperties}
                />
              ))}
              <div
                className="h-24 w-24 rounded-full flex items-center justify-center shadow-xl ring-4 animate-pop-in"
                style={{ backgroundColor: accent, boxShadow: `0 20px 40px -10px ${accentSoft}`, ['--tw-ring-color' as string]: accentRing }}
              >
                <svg viewBox="0 0 24 24" className="h-14 w-14 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7" strokeDasharray="40" className="animate-check-draw" />
                </svg>
              </div>
              <p className="text-xl font-bold text-foreground animate-rise-up text-center px-4">{feedback.phrase}</p>
            </div>
          </div>
        )}
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Atualize as informações do lead.' : 'Preencha os dados do novo lead.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="nome">Nome</Label>
              {isEdit && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="icon"
                    aria-label="Abrir Buscalink"
                    title="Buscalink"
                    className="h-8 w-8 bg-prospect text-prospect-foreground hover:bg-prospect/90 shadow-sm"
                    onClick={() => {
                      const copied = openBuscalinkTool(watch('nome'));
                      toast.success(copied ? 'Nome copiado — Buscalink aberto' : 'Buscalink aberto');
                    }}
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    aria-label="Abrir ferramentas de prospecção"
                    title="Buscalink + Script"
                    className="h-8 w-8 bg-prospect text-prospect-foreground hover:bg-prospect/90 shadow-sm"
                    onClick={() => {
                      const copied = openProspectTools(watch('nome'));
                      toast.success(copied ? 'Nome copiado — no Buscalink dê Ctrl+V' : 'Ferramentas abertas');
                    }}
                  >
                    <Lightbulb className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    aria-label="Abrir Script"
                    title="Script"
                    className="h-8 w-8 bg-prospect text-prospect-foreground hover:bg-prospect/90 shadow-sm"
                    onClick={() => { openScriptTool(watch('nome')); toast.success('Script aberto'); }}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(watch('nome')); toast.success('Nome copiado!'); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <Input id="nome" {...register('nome', { required: true })} placeholder="Nome do lead" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusValue} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="nota">Nota</Label>
              {isEdit && watch('nota') && (
                <button type="button" onClick={() => { navigator.clipboard.writeText(watch('nota')); toast.success('Nota copiada!'); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <LinkifiedTextarea
              id="nota"
              value={notaValue ?? ''}
              onChange={(value) => setValue('nota', value, { shouldDirty: true })}
              placeholder="Anotações sobre o lead..."
            />
          </div>

          {isEdit && watch('numero') && (
            <a
              href={`tel:${watch('numero').replace(/\D/g, '')}`}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-call px-4 py-6 text-call-foreground shadow-xl ring-4 ring-call/20 transition-transform active:scale-95"
              aria-label="Ligar para o lead"
            >
              <Phone className="h-9 w-9" strokeWidth={2.5} />
              <span className="text-xl font-bold">Ligar agora</span>
            </a>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="numero">Número</Label>
              {isEdit && (
                <button type="button" onClick={() => { navigator.clipboard.writeText(watch('numero')); toast.success('Número copiado!'); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Input id="numero" {...register('numero', { required: true })} placeholder="(11) 99999-9999" />
          </div>

          {isEdit && watch('numero') && (
            <div className="space-y-2">
              <Label>Ações rápidas</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 text-green-500 hover:text-green-600" asChild>
                  <a href={`https://wa.me/${watch('numero').replace(/\D/g, '')}?text=${encodeURIComponent(`${new Date().getHours() < 12 ? 'Ótimo dia' : 'Ótima tarde'}, por gentileza falo com ${watch('nome')}?`)}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </Button>
                <div className="w-px h-6 bg-border mx-0.5" />
                <TooltipProvider>
                  {['1','2','3','4','5','X','Y'].map((key) => (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0 text-xs font-bold"
                          onClick={() => handleFollowUp(key)}
                        >
                          {key}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-xs">{key === 'X' ? 'Reunião agendada' : key === 'Y' ? 'Preparando reunião' : `Follow-up ${key}`}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            </div>
          )}

          {isEdit && lead && (
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4" />
                  Tarefas
                </Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowTaskForm(!showTaskForm)}>
                  <Plus className="h-3 w-3 mr-1" />{showTaskForm ? 'Cancelar' : 'Nova'}
                </Button>
              </div>
              {showTaskForm && (
                <div className="space-y-2 bg-muted/50 p-2 rounded-md">
                  <Input
                    placeholder="Descrição da tarefa..."
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="datetime-local"
                    value={taskDateTime}
                    onChange={(e) => setTaskDateTime(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="w-full h-8 text-xs"
                    disabled={!taskTitle || !taskDateTime || addTask.isPending}
                    onClick={() => {
                      addTask.mutate(
                        { lead_id: lead.id, titulo: taskTitle, data_hora: new Date(taskDateTime).toISOString() },
                        { onSuccess: () => { setTaskTitle(''); setTaskDateTime(''); setShowTaskForm(false); } }
                      );
                    }}
                  >
                    Criar tarefa
                  </Button>
                </div>
              )}
              {leadTasks && leadTasks.length > 0 ? (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {leadTasks.map((t) => (
                    <div key={t.id} className="flex items-start gap-2 text-sm p-1.5 rounded bg-muted/30">
                      <Checkbox
                        checked={t.concluida}
                        onCheckedChange={(checked) => toggleTask.mutate({ id: t.id, concluida: !!checked, lead_id: t.lead_id })}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${t.concluida ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.titulo}</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(t.data_hora), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                      </div>
                      <button type="button" onClick={() => deleteTask.mutate({ id: t.id, lead_id: t.lead_id })} className="text-destructive hover:text-destructive/80 p-0.5">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma tarefa</p>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2 pt-2">
            {isEdit ? (
              <Button type="button" variant="destructive" size="icon" onClick={handleDelete} className="h-11 w-11">
                <Trash2 className="h-5 w-5" />
              </Button>
            ) : (
              <div />
            )}
            <Button type="submit" disabled={addLead.isPending || updateLead.isPending} className="h-11">
              {isEdit ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
