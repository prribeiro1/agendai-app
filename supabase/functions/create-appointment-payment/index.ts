
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
      console.error("Configurações necessárias não encontradas");
      return new Response(JSON.stringify({ 
        error: "Configuração de pagamento não encontrada" 
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
    
    // Pegar dados do body da requisição
    const { appointmentData, servicePrice, paymentMethod } = await req.json();
    console.log("Dados recebidos:", { appointmentData, servicePrice, paymentMethod });

    // Buscar conta conectada da barbearia
    const { data: connectAccount, error: connectError } = await supabase
      .from("stripe_connect_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("barbershop_id", appointmentData.barbershop_id)
      .single();

    if (connectError || !connectAccount) {
      console.error("Conta conectada não encontrada:", connectError);
      return new Response(JSON.stringify({ 
        error: "Esta barbearia ainda não configurou os pagamentos online" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!connectAccount.charges_enabled) {
      return new Response(JSON.stringify({ 
        error: "Os pagamentos online estão sendo configurados para esta barbearia" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Criar cliente no Stripe (pode ser guest)
    const customerEmail = appointmentData.client_email || `${appointmentData.client_phone}@guest.agendai.com`;
    
    let customer;
    try {
      const existingCustomers = await stripe.customers.list({
        email: customerEmail,
        limit: 1
      });
      
      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: customerEmail,
          name: appointmentData.client_name,
          phone: appointmentData.client_phone,
        });
      }
    } catch (error) {
      console.error("Erro ao criar/buscar cliente:", error);
      return new Response(JSON.stringify({ 
        error: "Erro ao processar dados do cliente" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Configurar métodos de pagamento baseado na escolha
    const paymentMethodTypes = paymentMethod === 'pix' ? ['pix'] : ['card'];
    if (paymentMethod === 'both') {
      paymentMethodTypes.push('card', 'pix');
    }

    // Calcular taxa da plataforma (5%)
    const applicationFeeAmount = Math.round(servicePrice * 100 * 0.05);

    // Criar sessão de checkout com Stripe Connect
    const origin = req.headers.get("origin") || "https://lovable.dev";
    
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: paymentMethodTypes,
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: `Agendamento - ${appointmentData.service_name}`,
                description: `Barbeiro: ${appointmentData.barber_name} | Data: ${appointmentData.appointment_date} ${appointmentData.appointment_time}`,
              },
              unit_amount: servicePrice * 100, // Converter para centavos
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/agendar/${appointmentData.barbershop_slug}?canceled=true`,
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: connectAccount.stripe_account_id,
          },
        },
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
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutos
        billing_address_collection: "required",
      });

      console.log("Sessão de pagamento criada:", session.id);

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
        error: "Erro ao iniciar processo de pagamento",
        details: sessionError.message 
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
