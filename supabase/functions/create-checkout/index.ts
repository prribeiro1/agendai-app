
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
    
    // Verificar se temos todas as variáveis de ambiente necessárias
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    console.log("Environment check:", {
      hasStripeKey: !!stripeSecretKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      stripeKeyPrefix: stripeSecretKey ? stripeSecretKey.substring(0, 7) : 'none'
    });
    
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY não configurada no ambiente");
    }

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Configurações do Supabase não encontradas");
    }

    // Inicializar Stripe com validação da chave
    let stripe;
    try {
      stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2022-11-15",
        httpClient: Stripe.createFetchHttpClient(),
      });
      console.log("Stripe inicializado com sucesso");
    } catch (stripeError) {
      console.error("Erro ao inicializar Stripe:", stripeError);
      throw new Error("Erro na configuração do Stripe: chave inválida");
    }

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Token de autorização não fornecido");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("Erro de autenticação:", userError);
      throw new Error("Usuário não autenticado");
    }

    console.log("Usuário autenticado:", user.email);

    // Verificar se o usuário já possui uma barbearia
    const { data: barbershop, error: barbershopError } = await supabase
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

    if (barbershopError) {
      console.error("Erro ao buscar barbearia:", barbershopError);
      throw new Error("Erro ao verificar barbearia do usuário");
    }

    if (!barbershop) {
      throw new Error("Nenhuma barbearia encontrada para este usuário");
    }

    console.log("Barbearia encontrada:", barbershop.name);

    let customerId;
    if (barbershop.subscriptions && barbershop.subscriptions.length > 0 && barbershop.subscriptions[0]?.stripe_customer_id) {
      customerId = barbershop.subscriptions[0].stripe_customer_id;
      console.log("Cliente Stripe existente:", customerId);
      
      // Verificar se o cliente ainda existe no Stripe
      try {
        await stripe.customers.retrieve(customerId);
        console.log("Cliente confirmado no Stripe");
      } catch (customerError) {
        console.log("Cliente não encontrado no Stripe, criando novo");
        customerId = null;
      }
    }

    if (!customerId) {
      // Criar cliente no Stripe
      console.log("Criando novo cliente no Stripe");
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: barbershop.name,
          metadata: {
            barbershopId: barbershop.id,
            supabaseUserId: user.id,
          },
        });
        customerId = customer.id;
        console.log("Cliente criado com sucesso:", customerId);

        // Atualizar ou criar registro de assinatura
        const { error: subscriptionError } = await supabase
          .from("subscriptions")
          .upsert({
            barbershop_id: barbershop.id,
            stripe_customer_id: customerId,
            status: "incomplete",
            updated_at: new Date().toISOString(),
          });

        if (subscriptionError) {
          console.error("Erro ao atualizar assinatura:", subscriptionError);
        }
      } catch (customerCreateError) {
        console.error("Erro ao criar cliente no Stripe:", customerCreateError);
        throw new Error("Erro ao criar cliente no sistema de pagamento");
      }
    }

    // Criar sessão Stripe para assinatura
    console.log("Criando sessão de checkout");
    const origin = req.headers.get("origin") || "https://lovable.dev";
    
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: "Assinatura AgendAI Premium",
                description: "Sistema completo de agendamento online para barbearias",
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
        success_url: `${origin}?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}?canceled=true`,
        metadata: {
          barbershopId: barbershop.id,
          userId: user.id,
        },
        allow_promotion_codes: true,
        billing_address_collection: "required",
      });

      console.log("Sessão criada com sucesso:", session.id);

      return new Response(JSON.stringify({ 
        url: session.url,
        sessionId: session.id 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (sessionError) {
      console.error("Erro ao criar sessão de checkout:", sessionError);
      throw new Error("Erro ao criar sessão de pagamento");
    }

  } catch (error) {
    console.error("Erro geral na função create-checkout:", error);
    
    let errorMessage = "Erro interno do servidor";
    let statusCode = 500;
    
    if (error.message) {
      if (error.message.includes("chave inválida") || error.message.includes("STRIPE_SECRET_KEY")) {
        errorMessage = "Configuração de pagamento inválida. Entre em contato com o suporte.";
        statusCode = 500;
      } else if (error.message.includes("não autenticado")) {
        errorMessage = "Usuário não autenticado";
        statusCode = 401;
      } else if (error.message.includes("Nenhuma barbearia")) {
        errorMessage = "Você precisa ter uma barbearia cadastrada para assinar";
        statusCode = 404;
      } else {
        errorMessage = error.message;
      }
    }

    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.message 
    }), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
