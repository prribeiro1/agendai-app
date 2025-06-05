
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
    console.log("=== VERIFY PAYMENT STARTED ===");
    
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
    
    const { sessionId } = await req.json();
    console.log("Verificando sessão:", sessionId);

    // Buscar sessão no Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("Status da sessão:", session.payment_status);

    if (session.payment_status === 'paid') {
      // Criar agendamento no banco
      const metadata = session.metadata;
      
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([{
          barbershop_id: metadata.barbershop_id,
          service_id: metadata.service_id,
          barber_id: metadata.barber_id,
          appointment_date: metadata.appointment_date,
          appointment_time: metadata.appointment_time,
          client_name: metadata.client_name,
          client_phone: metadata.client_phone,
          client_email: metadata.client_email || null,
          notes: metadata.notes || null,
          payment_status: 'paid',
          payment_method: session.payment_method_types[0],
          stripe_session_id: sessionId,
        }])
        .select(`
          *,
          services (
            name,
            price
          ),
          barbers (
            name
          )
        `)
        .single();

      if (appointmentError) {
        console.error("Erro ao criar agendamento:", appointmentError);
        return new Response(JSON.stringify({ 
          error: "Erro ao criar agendamento",
          details: appointmentError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Agendamento criado com sucesso:", appointment.id);

      return new Response(JSON.stringify({ 
        success: true,
        appointment: appointment
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false,
        status: session.payment_status
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Erro geral na função verify-payment:", error);
    
    return new Response(JSON.stringify({ 
      error: "Erro interno do servidor",
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
