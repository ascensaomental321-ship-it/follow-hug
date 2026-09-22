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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get today's date range (00:00 to 23:59:59)
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

    // Get status changes for today
    const { data: history, error } = await supabase
      .from('lead_status_history')
      .select('new_status, lead_id')
      .gte('changed_at', startOfDay)
      .lte('changed_at', endOfDay)

    if (error) throw error

    // Count per status
    const counts: Record<string, number> = {}
    const uniqueLeadIds = new Set<string>()
    for (const h of history ?? []) {
      counts[h.new_status] = (counts[h.new_status] || 0) + 1
      uniqueLeadIds.add(h.lead_id)
    }

    // Get total leads
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })

    // Get "Sem contato" count
    const { count: semContatoCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Sem contato')

    // Build message
    const date = now.toLocaleDateString('pt-BR')
    let message = `📊 Relatório CRM Pro — ${date}\n\n`
    message += `Sem contato: ${semContatoCount ?? 0}\n\n`
    message += `Movimentações do dia:\n`

    const statuses = ['Sem contato', 'Ligação feita', 'Religar', 'WhatsApp feito', 'Interesse identificado', 'Reunião agendada', 'Fechado', 'Descartado']
    for (const s of statuses) {
      const c = counts[s] || 0
      if (c > 0) {
        message += `  → ${s}: ${c}\n`
      }
    }

    if (Object.keys(counts).length === 0) {
      message += '  Nenhuma movimentação hoje.\n'
    }

    message += `\nLeads mexidos no dia: ${uniqueLeadIds.size}`

    // Send to ntfy
    const ntfyRes = await fetch('https://ntfy.sh/zenter_leads', {
      method: 'POST',
      headers: { 'Title': `CRM Pro Zenter - Relatório ${date}` },
      body: message,
    })

    if (!ntfyRes.ok) {
      throw new Error(`ntfy error: ${ntfyRes.status}`)
    }

    return new Response(JSON.stringify({ success: true, message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
