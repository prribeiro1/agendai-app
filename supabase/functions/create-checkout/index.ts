
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
    console.log("=== CREATE CHECKOUT STARTED ===");
    
    // Verificar variáveis de ambiente
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("Environment check:", {
      hasStripeKey: !!stripeSecretKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
    
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY não configurada");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Configurações do Supabase não encontradas");
    }

    // Inicializar Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Token de autorização não fornecido");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Obter usuário
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("Erro de autenticação:", userError);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Usuário verificado:", user.email);

    // Verificar se o usuário já possui uma barbearia
    const { data: barbershop, error: barbershopError } = await supabase
      .from("barbershops")
      .select(`
        id, 
        name, 
        subscriptions (
          id,
          stripe_customer_id,
          stripe_subscription_id,
          status,
          is_trial,
          trial_end
        )
      `)
      .eq("owner_id", user.id)
      .single();

    if (barbershopError) {
      console.error("Erro ao buscar barbearia:", barbershopError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar barbearia" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!barbershop) {
      return new Response(
        JSON.stringify({ error: "Nenhuma barbearia encontrada para este usuário" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Barbearia encontrada:", barbershop.name);

    // Verificar se já tem assinatura ativa
    if (barbershop.subscriptions && barbershop.subscriptions.length > 0) {
      const subscription = barbershop.subscriptions[0];
      if (subscription.status === 'active') {
        return new Response(
          JSON.stringify({ error: "Você já possui uma assinatura ativa" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Buscar ou criar cliente no Stripe
    let customerId = barbershop.subscriptions?.[0]?.stripe_customer_id;
    
    if (!customerId) {
      console.log("Criando novo cliente no Stripe");
      const customer = await stripe.customers.create({
        email: user.email,
        name: barbershop.name,
        metadata: {
          barbershop_id: barbershop.id,
          user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log("Cliente criado:", customerId);
    } else {
      console.log("Cliente existente encontrado:", customerId);
    }

    // Criar sessão de checkout - VALOR CORRIGIDO PARA R$ 49,90
    const origin = req.headers.get("origin") || "https://lwdiadresmxwmebmfpig.supabase.co";
    
    console.log("Criando checkout session...");
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card', 'boleto'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'AgendAI - Plano Premium',
              description: 'Sistema completo de agendamentos para barbearias',
            },
            unit_amount: 4990, // R$ 49,90 em centavos
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      metadata: {
        barbershop_id: barbershop.id,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          barbershop_id: barbershop.id,
          user_id: user.id,
        },
      },
    });

    console.log("Checkout session criada:", session.id);

    // Atualizar ou criar registro de assinatura
    const subscriptionData = {
      barbershop_id: barbershop.id,
      stripe_customer_id: customerId,
      status: 'pending',
      updated_at: new Date().toISOString(),
    };

    if (barbershop.subscriptions && barbershop.subscriptions.length > 0) {
      await supabase
        .from("subscriptions")
        .update(subscriptionData)
        .eq("id", barbershop.subscriptions[0].id);
    } else {
      await supabase
        .from("subscriptions")
        .insert({
          ...subscriptionData,
          created_at: new Date().toISOString(),
        });
    }

    console.log("Registro da assinatura atualizado");

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro ao criar checkout:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno ao criar checkout",
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
