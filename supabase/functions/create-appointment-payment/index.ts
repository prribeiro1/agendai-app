
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
    console.log("=== CREATE APPOINTMENT PAYMENT STARTED ===");
    
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("Environment check:", {
      hasStripeKey: !!stripeSecretKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      stripeKeyType: stripeSecretKey ? (stripeSecretKey.startsWith('sk_test_') ? 'test' : 'live') : 'none'
    });
    
    if (!stripeSecretKey || !supabaseUrl || !supabaseKey) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ 
        error: "Configuração não encontrada" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body with better error handling
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body parsed successfully:", JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(JSON.stringify({ 
        error: "Dados de requisição inválidos" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { appointmentData, servicePrice, paymentMethod } = requestBody;
    
    // Validate required fields
    if (!appointmentData || !servicePrice || !paymentMethod) {
      console.error("Missing required fields:", { 
        hasAppointmentData: !!appointmentData, 
        hasServicePrice: !!servicePrice, 
        hasPaymentMethod: !!paymentMethod 
      });
      return new Response(JSON.stringify({ 
        error: "Dados obrigatórios não fornecidos" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Dados recebidos:", { 
      barbershop_id: appointmentData.barbershop_id,
      service_name: appointmentData.service_name,
      servicePrice, 
      paymentMethod 
    });

    // Initialize Stripe
    let stripe;
    try {
      stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2022-11-15",
        httpClient: Stripe.createFetchHttpClient(),
      });
      console.log("Stripe initialized successfully");
    } catch (stripeInitError) {
      console.error("Failed to initialize Stripe:", stripeInitError);
      return new Response(JSON.stringify({ 
        error: "Erro na inicialização do sistema de pagamento" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se a barbearia tem conta Stripe Connect configurada
    console.log("Buscando conta conectada para barbearia:", appointmentData.barbershop_id);
    const { data: connectAccount, error: connectError } = await supabase
      .from("stripe_connect_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("barbershop_id", appointmentData.barbershop_id)
      .single();

    if (connectError) {
      console.error("Erro ao buscar conta conectada:", connectError);
      return new Response(JSON.stringify({ 
        error: "Esta barbearia ainda não configurou os pagamentos online" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!connectAccount) {
      console.error("Nenhuma conta conectada encontrada");
      return new Response(JSON.stringify({ 
        error: "Esta barbearia ainda não configurou os pagamentos online" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Conta conectada encontrada:", {
      stripe_account_id: connectAccount.stripe_account_id,
      charges_enabled: connectAccount.charges_enabled
    });

    // Verificar se é uma chave de teste
    const isTestKey = stripeSecretKey.startsWith('sk_test_');
    console.log("Modo de teste:", isTestKey);

    // Configurar métodos de pagamento baseado na escolha
    let payment_method_types = [];
    if (paymentMethod === 'card') {
      payment_method_types = ['card'];
    } else if (paymentMethod === 'pix') {
      payment_method_types = ['card']; // PIX ainda não disponível no Brasil via Stripe
    }

    console.log("Métodos de pagamento configurados:", payment_method_types);

    // Obter a origem para as URLs de sucesso e cancelamento
    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://lovable.dev";
    console.log("Origin detectada:", origin);

    // Calcular taxa da plataforma (5%) apenas se não for teste
    const applicationFeeAmount = isTestKey ? 0 : Math.round(servicePrice * 100 * 0.05);
    
    console.log("Configuração da sessão:", {
      servicePrice,
      applicationFeeAmount,
      connectAccountId: connectAccount.stripe_account_id,
      isTestMode: isTestKey,
      origin
    });

    try {
      // Criar sessão de checkout
      const sessionConfig = {
        payment_method_types,
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: `${appointmentData.service_name} - ${appointmentData.barber_name}`,
                description: `Agendamento para ${appointmentData.appointment_date} às ${appointmentData.appointment_time}`,
              },
              unit_amount: Math.round(servicePrice * 100), // Converter para centavos
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/agendar/${appointmentData.barbershop_slug}?canceled=true`,
        metadata: {
          barbershop_id: appointmentData.barbershop_id,
          service_id: appointmentData.service_id,
          barber_id: appointmentData.barber_id,
          appointment_date: appointmentData.appointment_date,
          appointment_time: appointmentData.appointment_time,
          client_name: appointmentData.client_name,
          client_phone: appointmentData.client_phone,
          client_email: appointmentData.client_email || '',
          notes: appointmentData.notes || '',
        },
      };

      // Adicionar configuração de taxa apenas se não for teste e a conta suportar
      if (!isTestKey && applicationFeeAmount > 0) {
        sessionConfig.payment_intent_data = {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: connectAccount.stripe_account_id,
          },
        };
      }

      console.log("Criando sessão Stripe com configuração:", JSON.stringify(sessionConfig, null, 2));

      const session = await stripe.checkout.sessions.create(sessionConfig);

      console.log("Sessão criada com sucesso:", {
        sessionId: session.id,
        url: session.url
      });

      return new Response(JSON.stringify({ 
        url: session.url 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (stripeSessionError) {
      console.error("Erro detalhado ao criar sessão Stripe:", {
        message: stripeSessionError.message,
        type: stripeSessionError.type,
        code: stripeSessionError.code,
        statusCode: stripeSessionError.statusCode,
        requestId: stripeSessionError.requestId
      });
      
      return new Response(JSON.stringify({ 
        error: "Erro ao criar sessão de pagamento",
        details: stripeSessionError.message,
        code: stripeSessionError.code || 'unknown'
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Erro geral na função create-appointment-payment:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(JSON.stringify({ 
      error: "Erro interno do servidor",
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
