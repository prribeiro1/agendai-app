
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
    
    if (!stripeSecretKey || !supabaseUrl || !supabaseKey) {
      console.error("Missing environment variables");
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
    
    const { appointmentData, servicePrice, paymentMethod } = await req.json();
    
    console.log("Dados recebidos:", { appointmentData, servicePrice, paymentMethod });

    // Verificar se a barbearia tem conta Stripe Connect configurada
    const { data: connectAccount, error: connectError } = await supabase
      .from("stripe_connect_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("barbershop_id", appointmentData.barbershop_id)
      .single();

    if (connectError || !connectAccount) {
      console.error("Erro ao buscar conta conectada:", connectError);
      return new Response(JSON.stringify({ 
        error: "Esta barbearia ainda não configurou os pagamentos online" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Conta conectada encontrada:", connectAccount.stripe_account_id);

    // Verificar se é uma chave de teste
    const isTestKey = stripeSecretKey.startsWith('sk_test_');
    console.log("Modo de teste:", isTestKey);

    // Verificar o status da conta no Stripe apenas se não for teste
    if (!isTestKey) {
      try {
        const account = await stripe.accounts.retrieve(connectAccount.stripe_account_id);
        console.log("Status da conta:", {
          charges_enabled: account.charges_enabled,
          transfers_enabled: account.capabilities?.transfers,
          details_submitted: account.details_submitted
        });

        if (!account.charges_enabled) {
          return new Response(JSON.stringify({ 
            error: "Esta barbearia ainda está finalizando a configuração dos pagamentos. Tente novamente em alguns minutos ou entre em contato com a barbearia." 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (account.capabilities?.transfers !== 'active') {
          return new Response(JSON.stringify({ 
            error: "Os pagamentos online estão sendo processados pelo Stripe. A barbearia precisa completar algumas verificações adicionais. Por favor, tente o pagamento no local ou entre em contato com a barbearia." 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

      } catch (stripeError) {
        console.error("Erro ao verificar conta Stripe:", stripeError);
        return new Response(JSON.stringify({ 
          error: "Erro ao verificar configuração de pagamentos da barbearia" 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.log("Modo de teste detectado - pulando validações de conta");
    }

    // Configurar métodos de pagamento baseado na escolha
    let payment_method_types = [];
    if (paymentMethod === 'card') {
      payment_method_types = ['card'];
    } else if (paymentMethod === 'pix') {
      payment_method_types = ['card']; // PIX ainda não disponível no Brasil via Stripe
    }

    // Obter a origem para as URLs de sucesso e cancelamento
    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://lovable.dev";

    // Calcular taxa da plataforma (5%)
    const applicationFeeAmount = Math.round(servicePrice * 100 * 0.05);
    
    console.log("Criando sessão de checkout:", {
      servicePrice,
      applicationFeeAmount,
      connectAccountId: connectAccount.stripe_account_id,
      isTestMode: isTestKey
    });

    try {
      // Criar sessão de checkout
      const session = await stripe.checkout.sessions.create({
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
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: connectAccount.stripe_account_id,
          },
        },
      });

      console.log("Sessão criada com sucesso:", session.id);

      return new Response(JSON.stringify({ 
        url: session.url 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (stripeSessionError) {
      console.error("Erro ao criar sessão Stripe:", stripeSessionError);
      
      // Se for erro de capacidades no modo de teste, tentar sem application fee
      if (isTestKey && stripeSessionError.message?.includes('insufficient_capabilities')) {
        console.log("Tentando criar sessão sem application fee para modo de teste");
        
        try {
          const sessionWithoutFee = await stripe.checkout.sessions.create({
            payment_method_types,
            line_items: [
              {
                price_data: {
                  currency: 'brl',
                  product_data: {
                    name: `${appointmentData.service_name} - ${appointmentData.barber_name}`,
                    description: `Agendamento para ${appointmentData.appointment_date} às ${appointmentData.appointment_time}`,
                  },
                  unit_amount: Math.round(servicePrice * 100),
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
            // Remover payment_intent_data para modo de teste
          });

          console.log("Sessão criada sem taxa para teste:", sessionWithoutFee.id);

          return new Response(JSON.stringify({ 
            url: sessionWithoutFee.url 
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });

        } catch (fallbackError) {
          console.error("Erro mesmo sem application fee:", fallbackError);
          return new Response(JSON.stringify({ 
            error: "Erro ao criar sessão de pagamento de teste",
            details: fallbackError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      
      return new Response(JSON.stringify({ 
        error: "Erro ao criar sessão de pagamento",
        details: stripeSessionError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Erro geral na função create-appointment-payment:", error);
    
    return new Response(JSON.stringify({ 
      error: "Erro interno do servidor",
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
