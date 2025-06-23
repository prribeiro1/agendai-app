
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    console.log("=== CREATE MERCADOPAGO SUBSCRIPTION STARTED ===");
    
    const mercadoPagoToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!mercadoPagoToken || !supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ 
        error: "Configuração não encontrada" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: "Token de autorização necessário" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar usuário
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ 
        error: "Usuário não autenticado" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Usuário verificado:", userData.user.email);

    // Buscar barbearia do usuário
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('id, name, slug')
      .eq('owner_id', userData.user.id)
      .single();

    if (barbershopError || !barbershop) {
      return new Response(JSON.stringify({ 
        error: "Barbearia não encontrada" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Barbearia encontrada:", barbershop.name);

    // Obter a origem para as URLs de sucesso e cancelamento
    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://lovable.dev";
    console.log("Origin detectada:", origin);

    // Criar preferência de assinatura no Mercado Pago
    const preferenceData = {
      items: [
        {
          title: "Assinatura BarberApp - Mensal",
          description: `Assinatura mensal para ${barbershop.name}`,
          quantity: 1,
          unit_price: 49.90,
          currency_id: "BRL"
        }
      ],
      payer: {
        name: barbershop.name,
        email: userData.user.email
      },
      payment_methods: {
        excluded_payment_types: [],
        excluded_payment_methods: [],
        installments: 1
      },
      back_urls: {
        success: `${origin}/?subscription_success=true`,
        failure: `${origin}/?subscription_failed=true`,
        pending: `${origin}/?subscription_pending=true`
      },
      auto_return: "approved",
      external_reference: JSON.stringify({
        type: "subscription",
        barbershop_id: barbershop.id,
        user_id: userData.user.id,
        plan: "monthly"
      })
    };

    console.log("Criando preferência de assinatura MercadoPago");

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na resposta do MercadoPago:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Erro do MercadoPago: ${response.status} - ${errorText}`);
    }

    const preference = await response.json();
    console.log("Preferência de assinatura criada com sucesso:", {
      id: preference.id,
      init_point: preference.init_point
    });

    return new Response(JSON.stringify({ 
      url: preference.init_point,
      preference_id: preference.id
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro geral na função create-mercadopago-subscription:", error);
    
    return new Response(JSON.stringify({ 
      error: "Erro interno do servidor",
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
