
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
    console.log("=== CREATE MERCADOPAGO PAYMENT STARTED ===");
    
    const mercadoPagoToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("Environment check:", {
      hasMercadoPagoToken: !!mercadoPagoToken,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
    });
    
    if (!mercadoPagoToken || !supabaseUrl || !supabaseKey) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ 
        error: "Configuração não encontrada" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obter a origem para as URLs de sucesso e cancelamento
    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://lovable.dev";
    console.log("Origin detectada:", origin);

    // Para pagamento no local, não criar preferência no MP
    if (paymentMethod === 'cash') {
      return new Response(JSON.stringify({ 
        payment_type: 'cash',
        message: 'Agendamento será criado com pagamento no local'
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Método de pagamento selecionado:", paymentMethod);

    // Criar preferência no Mercado Pago
    const preferenceData = {
      items: [
        {
          title: `${appointmentData.service_name} - ${appointmentData.barber_name}`,
          description: `Agendamento para ${appointmentData.appointment_date} às ${appointmentData.appointment_time}`,
          quantity: 1,
          unit_price: servicePrice,
          currency_id: "BRL"
        }
      ],
      payer: {
        name: appointmentData.client_name,
        email: appointmentData.client_email || `${appointmentData.client_phone}@temp.com`,
        phone: {
          number: appointmentData.client_phone
        }
      },
      back_urls: {
        success: `${origin}/pagamento-sucesso?payment_id={payment_id}&status={status}&merchant_order_id={merchant_order_id}`,
        failure: `${origin}/agendar/${appointmentData.barbershop_slug}?payment_failed=true`,
        pending: `${origin}/pagamento-sucesso?payment_id={payment_id}&status={status}&merchant_order_id={merchant_order_id}`
      },
      auto_return: "approved",
      external_reference: JSON.stringify({
        barbershop_id: appointmentData.barbershop_id,
        service_id: appointmentData.service_id,
        barber_id: appointmentData.barber_id,
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time,
        client_name: appointmentData.client_name,
        client_phone: appointmentData.client_phone,
        client_email: appointmentData.client_email || '',
        notes: appointmentData.notes || '',
      }),
      notification_url: `${origin}/webhook/mercadopago`,
      // Configurações para garantir pagamento sem necessidade de conta
      binary_mode: false, // Alterado para false para evitar redirect forçado
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      // Forçar checkout como guest
      marketplace: undefined,
      marketplace_fee: 0
    };

    // Configurar métodos de pagamento baseado na escolha do usuário
    if (paymentMethod === 'pix') {
      // Para PIX: apenas PIX disponível, sem necessidade de login
      preferenceData.payment_methods = {
        excluded_payment_types: [
          { id: "credit_card" },
          { id: "debit_card" },
          { id: "ticket" }
        ],
        installments: 1,
        default_installments: 1
      };
      console.log("Configurando para PIX apenas - sem necessidade de login");
    } else if (paymentMethod === 'card') {
      // Para Cartão: permitir apenas cartões
      preferenceData.payment_methods = {
        excluded_payment_types: [
          { id: "ticket" }
        ],
        excluded_payment_methods: [
          { id: "pix" }
        ],
        installments: 12,
        default_installments: 1
      };
      console.log("Configurando para cartões apenas");
    }

    console.log("Criando preferência MercadoPago com dados:", JSON.stringify(preferenceData, null, 2));

    try {
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
      console.log("Preferência criada com sucesso:", {
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

    } catch (mpError) {
      console.error("Erro detalhado ao criar preferência MercadoPago:", {
        message: mpError.message,
        stack: mpError.stack
      });
      
      return new Response(JSON.stringify({ 
        error: "Erro ao criar sessão de pagamento",
        details: mpError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Erro geral na função create-mercadopago-payment:", {
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
