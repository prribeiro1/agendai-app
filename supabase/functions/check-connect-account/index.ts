
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
    console.log("=== CHECK CONNECT ACCOUNT STARTED ===");
    
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!stripeSecretKey || !supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ 
        error: "Configuração não encontrada" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: "Não autenticado" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ 
        error: "Usuário não autenticado" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar barbearia do usuário
    const { data: barbershop, error: barbershopError } = await supabase
      .from("barbershops")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (barbershopError || !barbershop) {
      return new Response(JSON.stringify({ 
        error: "Barbearia não encontrada" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar conta conectada
    const { data: connectAccount, error: connectError } = await supabase
      .from("stripe_connect_accounts")
      .select("stripe_account_id, account_status, charges_enabled, payouts_enabled")
      .eq("barbershop_id", barbershop.id)
      .single();

    if (connectError || !connectAccount) {
      return new Response(JSON.stringify({ 
        connected: false,
        account_status: null
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar status no Stripe
    const account = await stripe.accounts.retrieve(connectAccount.stripe_account_id);
    
    const chargesEnabled = account.charges_enabled;
    const payoutsEnabled = account.payouts_enabled;
    
    // Atualizar status no banco se mudou
    if (chargesEnabled !== connectAccount.charges_enabled || payoutsEnabled !== connectAccount.payouts_enabled) {
      await supabase
        .from("stripe_connect_accounts")
        .update({
          charges_enabled: chargesEnabled,
          payouts_enabled: payoutsEnabled,
          account_status: chargesEnabled && payoutsEnabled ? "active" : "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("barbershop_id", barbershop.id);
    }

    return new Response(JSON.stringify({ 
      connected: true,
      account_id: connectAccount.stripe_account_id,
      account_status: chargesEnabled && payoutsEnabled ? "active" : "pending",
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função check-connect-account:", error);
    
    return new Response(JSON.stringify({ 
      error: "Erro interno do servidor",
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
