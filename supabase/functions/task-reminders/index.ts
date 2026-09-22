import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    let taskId: string | null = null
    try {
      const body = await req.json()
      taskId = body?.task_id ?? null
    } catch (_) {
      taskId = null
    }

    const now = new Date().toISOString()

    let query = supabase
      .from('lead_tasks')
      .select('id, titulo, data_hora, lead_id, leads(nome, numero)')
      .eq('concluida', false)
      .eq('notificada', false)

    query = taskId ? query.eq('id', taskId) : query.lte('data_hora', now).limit(50)

    const { data: tasks, error } = await query

    if (error) throw error


    const sent: string[] = []

    for (const t of tasks ?? []) {
      const lead = (t as unknown as { leads: { nome: string; numero: string } | null }).leads
      const hora = new Date(t.data_hora).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })

      const message =
        `⏰ ${t.titulo}\n\n` +
        `Lead: ${lead?.nome ?? 'Sem nome'}\n` +
        `Número: ${lead?.numero ?? '-'}\n` +
        `Horário: ${hora}`

      const res = await fetch('https://ntfy.sh/zenter_leads', {
        method: 'POST',
        headers: {
          'Title': `Lembrete: ${lead?.nome ?? 'Lead'}`,
          'Tags': 'alarm_clock',
          ...(lead?.numero
            ? { 'Actions': `view, Ligar, tel:${lead.numero.replace(/\D/g, '')}` }
            : {}),
        },
        body: message,
      })

      if (!res.ok) {
        console.error(`ntfy error [${res.status}]: ${await res.text()}`)
        continue
      }

      await supabase.from('lead_tasks').update({ notificada: true }).eq('id', t.id)
      await supabase.rpc('unschedule_task_reminder', { _task_id: t.id })
      sent.push(t.id)
    }


    return new Response(JSON.stringify({ success: true, sent: sent.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('task-reminders failed:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
