
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

    const supabaseAdminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

    const supabase = createClient(supabaseUrl, supabaseAdminKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Obter usuário 
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
          id,
          stripe_customer_id,
          stripe_subscription_id,
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

    // Se não tem assinatura, retorna não assinado
    if (!barbershop.subscriptions || barbershop.subscriptions.length === 0 || !barbershop.subscriptions[0]?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ subscribed: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subscriptionRecord = barbershop.subscriptions[0];
    const customerId = subscriptionRecord.stripe_customer_id;

    // Verificar assinatura ativa no Stripe
    let isActive = false;
    let subscriptionEnd = null;
    let stripeSubscriptionId = subscriptionRecord.stripe_subscription_id;

    if (stripeSubscriptionId) {
      // Usar ID de assinatura existente
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      isActive = subscription.status === "active";
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    } else {
      // Buscar por assinaturas deste cliente
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
      }
    }

    // Atualizar registro no Supabase
    if (isActive) {
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
      // Desativar assinatura se estava ativa e não está mais
      await supabase.from("subscriptions").update({
        status: "inactive",
        updated_at: new Date().toISOString(),
      }).eq("id", subscriptionRecord.id);

      // Desativar a barbearia
      await supabase.from("barbershops").update({
        is_active: false,
        updated_at: new Date().toISOString(),
      }).eq("id", barbershop.id);
    }

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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
