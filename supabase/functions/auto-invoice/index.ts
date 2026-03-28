import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ALLOWED_ORIGINS = [
  'https://app.fitcore.tech',
  'https://client.fitcore.tech',
  'https://fitcore.tech',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date();
    const todayDate = today.getDate();
    const todayDay = today.getDay(); // 0=Sun, 1=Mon, ...
    const periodLabel = today.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    // Get all active clients with their coach and plan info
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, coach_id, name, email, plan, start_date, status')
      .eq('status', 'active');

    if (clientsError) {
      console.error('Failed to load clients:', clientsError);
      return new Response(JSON.stringify({ error: 'Failed to load clients' }), {
        status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ message: 'No active clients', invoicesCreated: 0 }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Get all coaching plans for billing cycle info
    const coachIds = [...new Set(clients.map(c => c.coach_id))];
    const { data: plans } = await supabase
      .from('coaching_plans')
      .select('*')
      .in('coach_id', coachIds)
      .eq('is_active', true);

    const planMap = new Map<string, { price: number; billingCycle: string }>();
    for (const p of (plans ?? [])) {
      // Key by coach_id + plan name (since client.plan stores the name)
      planMap.set(`${p.coach_id}:${p.name}`, { price: Number(p.price), billingCycle: p.billing_cycle });
    }

    let invoicesCreated = 0;

    for (const client of clients) {
      if (!client.start_date || !client.plan) continue;

      const planInfo = planMap.get(`${client.coach_id}:${client.plan}`);
      if (!planInfo) continue; // No matching plan found

      const startDate = new Date(client.start_date);
      let shouldBill = false;

      if (planInfo.billingCycle === 'monthly') {
        // Bill on the same day of the month as start_date
        shouldBill = startDate.getDate() === todayDate;
      } else if (planInfo.billingCycle === 'weekly') {
        // Bill on the same day of the week as start_date
        shouldBill = startDate.getDay() === todayDay;
      } else {
        // one-time — skip automated billing
        continue;
      }

      if (!shouldBill) continue;

      // Check if invoice already exists for this period (idempotency)
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('client_id', client.id)
        .eq('period', periodLabel)
        .eq('plan', client.plan)
        .maybeSingle();

      if (existingInvoice) continue; // Already billed for this period

      // Create the invoice
      const invoiceId = crypto.randomUUID();
      const dueDate = today.toISOString().split('T')[0];

      const { error: insertError } = await supabase.from('invoices').insert({
        id: invoiceId,
        client_id: client.id,
        coach_id: client.coach_id,
        amount: planInfo.price,
        status: 'pending',
        due_date: dueDate,
        period: periodLabel,
        plan: client.plan,
      });

      if (insertError) {
        console.error(`Failed to create invoice for client ${client.id}:`, insertError);
        continue;
      }

      // Send email notification (fire and forget)
      try {
        await supabase.functions.invoke('notify-invoice', {
          body: { invoiceId },
        });
      } catch {
        // Email is best-effort, don't fail the whole function
      }

      invoicesCreated++;
      console.log(`Auto-invoice created for client ${client.id}`);
    }

    return new Response(JSON.stringify({
      message: `Auto-invoicing complete`,
      invoicesCreated,
      clientsChecked: clients.length,
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Auto-invoice error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
