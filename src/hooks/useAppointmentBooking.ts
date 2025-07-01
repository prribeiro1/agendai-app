
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
      console.log('Criando agendamento:', appointmentData);

      // Verificar se já existe um agendamento no mesmo horário
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
        throw checkError;
      }

      if (existingAppointment) {
        toast.error('Este horário já foi agendado. Por favor, escolha outro horário.');
        return { success: false };
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert([{
          barbershop_id: appointmentData.barbershop_id,
          service_id: appointmentData.service_id,
          barber_id: appointmentData.barber_id,
          appointment_date: appointmentData.appointment_date,
          appointment_time: appointmentData.appointment_time,
          client_name: appointmentData.client_name,
          client_phone: appointmentData.client_phone,
          client_email: appointmentData.client_email || null,
          notes: appointmentData.notes || null,
          no_talk: appointmentData.no_talk || false,
          status: 'confirmado',
          payment_status: 'free',
          payment_method: 'free'
        }])
        .select(`
          *,
          services (name, price),
          barbers (name)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar agendamento:', error);
        toast.error('Erro ao confirmar agendamento. Tente novamente.');
        throw error;
      }

      console.log('Agendamento criado com sucesso:', appointment);
      toast.success('Agendamento confirmado com sucesso!');
      
      return { 
        success: true, 
        appointment
      };

    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast.error('Erro ao confirmar agendamento. Tente novamente.');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    createAppointment,
    loading
  };
};
