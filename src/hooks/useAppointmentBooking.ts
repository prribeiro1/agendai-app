
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppointmentData {
  barbershop_id: string;
  service_id: string;
  barber_id: string;
  appointment_date: string;
  appointment_time: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  notes?: string;
  no_talk?: boolean;
}

export const useAppointmentBooking = () => {
  const [loading, setLoading] = useState(false);

  const createAppointment = async (appointmentData: AppointmentData) => {
    setLoading(true);
    
    try {
      console.log('=== INICIANDO CRIAÇÃO DO AGENDAMENTO ===');
      console.log('Dados do agendamento:', appointmentData);

      // Verificar se já existe um agendamento no mesmo horário
      console.log('Verificando agendamentos existentes...');
      const { data: existingAppointment, error: checkError } = await supabase
        .from('appointments')
        .select('id')
        .eq('barber_id', appointmentData.barber_id)
        .eq('appointment_date', appointmentData.appointment_date)
        .eq('appointment_time', appointmentData.appointment_time)
        .not('status', 'eq', 'cancelado')
        .maybeSingle();

      if (checkError) {
        console.error('Erro ao verificar agendamento existente:', checkError);
        toast.error(`Erro na verificação: ${checkError.message}`);
        return { success: false, error: checkError.message };
      }

      if (existingAppointment) {
        console.log('Horário já ocupado:', existingAppointment);
        toast.error('Este horário já foi agendado. Por favor, escolha outro horário.');
        return { success: false, error: 'Horário ocupado' };
      }

      console.log('Horário disponível, criando agendamento...');
      
      // Preparar dados para inserção
      const insertData = {
        barbershop_id: appointmentData.barbershop_id,
        service_id: appointmentData.service_id,
        barber_id: appointmentData.barber_id,
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time,
        client_name: appointmentData.client_name.trim(),
        client_phone: appointmentData.client_phone.trim(),
        client_email: appointmentData.client_email?.trim() || null,
        notes: appointmentData.notes?.trim() || null,
        no_talk: appointmentData.no_talk || false,
        status: 'confirmado',
        payment_status: 'free',
        payment_method: 'free'
      };

      console.log('Dados para inserção:', insertData);

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert([insertData])
        .select(`
          *,
          services (name, price),
          barbers (name)
        `)
        .single();

      if (error) {
        console.error('Erro detalhado ao criar agendamento:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        let errorMessage = 'Erro ao confirmar agendamento.';
        
        if (error.code === '23502') {
          errorMessage = 'Dados obrigatórios não preenchidos.';
        } else if (error.code === '23503') {
          errorMessage = 'Referência inválida nos dados do agendamento.';
        } else if (error.message) {
          errorMessage = `Erro: ${error.message}`;
        }
        
        toast.error(errorMessage);
        return { success: false, error: error.message };
      }

      console.log('Agendamento criado com sucesso:', appointment);
      toast.success('Agendamento confirmado com sucesso!');
      
      return { 
        success: true, 
        appointment
      };

    } catch (error) {
      console.error('Erro inesperado ao criar agendamento:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro inesperado: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    createAppointment,
    loading
  };
};
