
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
    console.log("=== CHECK SUBSCRIPTION STARTED ===");
    
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
          status
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

    // Se não tem assinatura, retorna não assinado
    if (!barbershop.subscriptions || barbershop.subscriptions.length === 0 || !barbershop.subscriptions[0]?.stripe_customer_id) {
      console.log("Nenhuma assinatura encontrada");
      return new Response(
        JSON.stringify({ subscribed: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subscriptionRecord = barbershop.subscriptions[0];
    const customerId = subscriptionRecord.stripe_customer_id;
    console.log("Cliente Stripe encontrado:", customerId);

    // Verificar assinatura ativa no Stripe
    let isActive = false;
    let subscriptionEnd = null;
    let stripeSubscriptionId = subscriptionRecord.stripe_subscription_id;

    try {
      if (stripeSubscriptionId) {
        // Usar ID de assinatura existente
        console.log("Verificando assinatura existente:", stripeSubscriptionId);
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        isActive = subscription.status === "active";
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        console.log("Status da assinatura:", subscription.status);
      } else {
        // Buscar por assinaturas deste cliente
        console.log("Buscando assinaturas para o cliente");
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0];
          isActive = true;
          stripeSubscriptionId = subscription.id;
          subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
          console.log("Assinatura ativa encontrada:", subscription.id);
        }
      }
    } catch (stripeError) {
      console.error("Erro ao verificar no Stripe:", stripeError);
      // Em caso de erro no Stripe, considerar como não ativo mas não falhar
      isActive = false;
    }

    // Atualizar registro no Supabase
    try {
      if (isActive) {
        console.log("Atualizando como ativa");
        await supabase.from("subscriptions").update({
          status: "active",
          stripe_subscription_id: stripeSubscriptionId,
          current_period_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        }).eq("id", subscriptionRecord.id);

        // Ativar a barbearia
        await supabase.from("barbershops").update({
          is_active: true,
          updated_at: new Date().toISOString(),
        }).eq("id", barbershop.id);
      } else if (subscriptionRecord.status === "active") {
        console.log("Desativando assinatura");
        // Desativar assinatura se estava ativa e não está mais
        await supabase.from("subscriptions").update({
          status: "inactive",
          updated_at: new Date().toISOString(),
        }).eq("id", subscriptionRecord.id);

        // Manter a barbearia ativa no modo teste
        await supabase.from("barbershops").update({
          is_active: true,
          updated_at: new Date().toISOString(),
        }).eq("id", barbershop.id);
      }
    } catch (updateError) {
      console.error("Erro ao atualizar banco de dados:", updateError);
    }

    console.log("Resultado final - subscribed:", isActive);

    return new Response(
      JSON.stringify({ 
        subscribed: isActive, 
        subscription_end: subscriptionEnd 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro ao verificar assinatura:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno ao verificar assinatura",
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
