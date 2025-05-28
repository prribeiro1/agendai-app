
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
    console.log("=== CUSTOMER PORTAL STARTED ===");
    
    // Verificar variáveis de ambiente
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    console.log("Environment check:", {
      hasStripeKey: !!stripeSecretKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey
    });
    
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY não configurada");
    }

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Configurações do Supabase não encontradas");
    }

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
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("Erro de autenticação:", userError);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Usuário autenticado:", user.email);

    // Verificar se o usuário tem uma barbearia com assinatura
    const { data: barbershop, error: barbershopError } = await supabase
      .from("barbershops")
      .select(`
        id, 
        subscriptions (
          stripe_customer_id
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

    if (!barbershop || !barbershop.subscriptions || barbershop.subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma assinatura encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerId = barbershop.subscriptions[0].stripe_customer_id;
    if (!customerId) {
      return new Response(
        JSON.stringify({ error: "Cliente Stripe não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Cliente Stripe encontrado:", customerId);

    // Verificar se o cliente ainda existe no Stripe
    try {
      await stripe.customers.retrieve(customerId);
    } catch (customerError) {
      console.error("Cliente não encontrado no Stripe:", customerError);
      return new Response(
        JSON.stringify({ error: "Cliente não encontrado no sistema de pagamento" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar sessão para o portal do cliente
    const origin = req.headers.get("origin") || "https://lovable.dev";
    
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: origin,
      });

      console.log("Sessão do portal criada:", session.id);

      return new Response(
        JSON.stringify({ url: session.url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (portalError) {
      console.error("Erro ao criar portal:", portalError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar portal de gerenciamento" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Erro ao criar sessão do portal:", error);
    
    let errorMessage = "Erro interno do servidor";
    if (error.message) {
      if (error.message.includes("STRIPE_SECRET_KEY")) {
        errorMessage = "Configuração de pagamento inválida";
      } else if (error.message.includes("não autorizado")) {
        errorMessage = "Usuário não autenticado";
      } else {
        errorMessage = error.message;
      }
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
