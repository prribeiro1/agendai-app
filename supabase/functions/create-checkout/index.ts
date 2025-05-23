
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Configurar cliente Supabase e Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se o usuário já possui uma barbearia
    const { data: barbershop } = await supabase
      .from("barbershops")
      .select(`
        id, 
        name, 
        subscriptions (
          stripe_customer_id,
          status
        )
      `)
      .eq("owner_id", user.id)
      .single();

    if (!barbershop) {
      return new Response(
        JSON.stringify({ error: "Nenhuma barbearia encontrada para este usuário" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let customerId;
    if (barbershop.subscriptions && barbershop.subscriptions.length > 0 && barbershop.subscriptions[0]?.stripe_customer_id) {
      customerId = barbershop.subscriptions[0].stripe_customer_id;
    } else {
      // Criar cliente no Stripe se não existir
      const customer = await stripe.customers.create({
        email: user.email,
        name: barbershop.name,
        metadata: {
          barbershopId: barbershop.id,
          supabaseUserId: user.id,
        },
      });
      customerId = customer.id;

      // Atualizar ou criar registro de assinatura
      await supabase
        .from("subscriptions")
        .upsert({
          barbershop_id: barbershop.id,
          stripe_customer_id: customerId,
          status: "incomplete",
          updated_at: new Date().toISOString(),
        });
    }

    // Criar sessão Stripe para assinatura
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: "Assinatura AgendAI",
              description: "Sistema de agendamento online para barbearias",
            },
            unit_amount: 1990, // R$19,90 em centavos
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}?success=true`,
      cancel_url: `${req.headers.get("origin")}?canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro ao criar sessão de checkout:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
