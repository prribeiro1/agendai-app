
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
      console.error("STRIPE_SECRET_KEY não está configurada");
      return new Response(JSON.stringify({ 
        error: "Configuração de pagamento não encontrada. A chave da API do Stripe não está configurada.",
        details: "STRIPE_SECRET_KEY não configurada" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar formato da chave Stripe
    if (!stripeSecretKey.startsWith('sk_test_') && !stripeSecretKey.startsWith('sk_live_')) {
      console.error("Formato de chave Stripe inválido");
      return new Response(JSON.stringify({ 
        error: "Chave da API do Stripe em formato inválido. Use uma chave que comece com sk_test_ ou sk_live_",
        details: "Formato de chave inválido" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error("Configurações do Supabase não encontradas");
      return new Response(JSON.stringify({ 
        error: "Erro de configuração do sistema",
        details: "Configurações do Supabase não encontradas" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Inicializar Stripe com validação da chave
    let stripe;
    try {
      stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2022-11-15",
        httpClient: Stripe.createFetchHttpClient(),
      });
      console.log("Stripe inicializado com sucesso");
      
      // Testar a chave fazendo uma requisição simples
      await stripe.customers.list({ limit: 1 });
      console.log("Chave Stripe validada com sucesso");
    } catch (stripeError) {
      console.error("Erro ao inicializar ou validar Stripe:", stripeError);
      return new Response(JSON.stringify({ 
        error: "Chave da API do Stripe inválida. Verifique se a chave está correta no dashboard do Stripe.",
        details: stripeError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Token de autorização não fornecido");
      return new Response(JSON.stringify({ 
        error: "Sessão expirada. Faça login novamente.",
        details: "Token de autorização não fornecido" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("Erro de autenticação:", userError);
      return new Response(JSON.stringify({ 
        error: "Sessão expirada. Faça login novamente.",
        details: "Usuário não autenticado" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ 
        error: "Erro ao verificar sua barbearia. Atualize a página e tente novamente.",
        details: "Erro ao buscar barbearia" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!barbershop) {
      console.error("Nenhuma barbearia encontrada para o usuário");
      return new Response(JSON.stringify({ 
        error: "Você precisa ter uma barbearia cadastrada para assinar",
        details: "Nenhuma barbearia encontrada" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        return new Response(JSON.stringify({ 
          error: "Erro ao processar dados do cliente. Verifique sua chave da API do Stripe.",
          details: customerCreateError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
      return new Response(JSON.stringify({ 
        error: "Erro ao iniciar processo de pagamento. Verifique sua chave da API do Stripe.",
        details: sessionError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Erro geral na função create-checkout:", error);
    
    return new Response(JSON.stringify({ 
      error: "Erro interno do servidor. Verifique se a chave da API do Stripe está configurada corretamente.",
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
