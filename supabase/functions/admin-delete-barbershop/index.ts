
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { barbershopId } = await req.json()

    if (!barbershopId) {
      return new Response(
        JSON.stringify({ error: 'barbershopId é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Iniciando exclusão admin do estabelecimento: ${barbershopId}`)

    // Excluir dados relacionados em ordem para evitar problemas de chave estrangeira
    
    // 1. Excluir agendamentos
    const { error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('barbershop_id', barbershopId)

    if (appointmentsError) {
      console.error('Erro ao excluir agendamentos:', appointmentsError)
      throw new Error(`Erro ao excluir agendamentos: ${appointmentsError.message}`)
    }
    console.log('Agendamentos excluídos com sucesso')

    // 2. Excluir barbeiros
    const { error: barbersError } = await supabaseAdmin
      .from('barbers')
      .delete()
      .eq('barbershop_id', barbershopId)

    if (barbersError) {
      console.error('Erro ao excluir barbeiros:', barbersError)
      throw new Error(`Erro ao excluir barbeiros: ${barbersError.message}`)
    }
    console.log('Barbeiros excluídos com sucesso')

    // 3. Excluir serviços
    const { error: servicesError } = await supabaseAdmin
      .from('services')
      .delete()
      .eq('barbershop_id', barbershopId)

    if (servicesError) {
      console.error('Erro ao excluir serviços:', servicesError)
      throw new Error(`Erro ao excluir serviços: ${servicesError.message}`)
    }
    console.log('Serviços excluídos com sucesso')

    // 4. Excluir horários de funcionamento
    const { error: businessHoursError } = await supabaseAdmin
      .from('business_hours')
      .delete()
      .eq('barbershop_id', barbershopId)

    if (businessHoursError) {
      console.error('Erro ao excluir horários:', businessHoursError)
      throw new Error(`Erro ao excluir horários: ${businessHoursError.message}`)
    }
    console.log('Horários de funcionamento excluídos com sucesso')

    // 5. Excluir feedbacks
    const { error: feedbacksError } = await supabaseAdmin
      .from('feedbacks')
      .delete()
      .eq('barbershop_id', barbershopId)

    if (feedbacksError) {
      console.error('Erro ao excluir feedbacks:', feedbacksError)
      throw new Error(`Erro ao excluir feedbacks: ${feedbacksError.message}`)
    }
    console.log('Feedbacks excluídos com sucesso')

    // 6. Excluir assinaturas
    const { error: subscriptionsError } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('barbershop_id', barbershopId)

    if (subscriptionsError) {
      console.error('Erro ao excluir assinaturas:', subscriptionsError)
      throw new Error(`Erro ao excluir assinaturas: ${subscriptionsError.message}`)
    }
    console.log('Assinaturas excluídas com sucesso')

    // 7. Excluir contas Stripe Connect
    const { error: stripeError } = await supabaseAdmin
      .from('stripe_connect_accounts')
      .delete()
      .eq('barbershop_id', barbershopId)

    if (stripeError) {
      console.error('Erro ao excluir contas Stripe:', stripeError)
      // Não vamos parar aqui pois pode não existir conta Stripe
    }
    console.log('Contas Stripe Connect verificadas/excluídas')

    // 8. Finalmente, excluir o estabelecimento
    const { error: barbershopError } = await supabaseAdmin
      .from('barbershops')
      .delete()
      .eq('id', barbershopId)

    if (barbershopError) {
      console.error('Erro ao excluir estabelecimento:', barbershopError)
      throw new Error(`Erro ao excluir estabelecimento: ${barbershopError.message}`)
    }

    console.log(`Estabelecimento ${barbershopId} excluído com sucesso`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Estabelecimento excluído com sucesso',
        barbershopId 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Erro na função admin-delete-barbershop:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
