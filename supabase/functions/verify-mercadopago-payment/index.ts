
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
    console.log("=== VERIFY MERCADOPAGO PAYMENT STARTED ===");
    
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

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { paymentId } = await req.json();
    console.log("Verificando pagamento:", paymentId);

    // Buscar pagamento no MercadoPago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar pagamento: ${response.status}`);
    }

    const payment = await response.json();
    console.log("Status do pagamento:", payment.status);

    if (payment.status === 'approved') {
      // Extrair dados do external_reference
      let metadata;
      try {
        metadata = JSON.parse(payment.external_reference);
      } catch (e) {
        console.error("Erro ao fazer parse do external_reference:", e);
        throw new Error("Dados do agendamento não encontrados");
      }
      
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
          payment_method: payment.payment_method_id,
          stripe_session_id: paymentId, // Reutilizando o campo para o payment_id do MP
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
        appointment: appointment,
        payment_details: {
          id: payment.id,
          status: payment.status,
          payment_method: payment.payment_method_id,
          transaction_amount: payment.transaction_amount
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false,
        status: payment.status,
        status_detail: payment.status_detail
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Erro geral na função verify-mercadopago-payment:", error);
    
    return new Response(JSON.stringify({ 
      error: "Erro interno do servidor",
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
