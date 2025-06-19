
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppointmentData {
  barbershop_id: string;
  barbershop_slug: string;
  service_id: string;
  service_name: string;
  barber_id: string;
  barber_name: string;
  appointment_date: string;
  appointment_time: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  notes?: string;
}

export const useMercadoPagoPayment = () => {
  const [loading, setLoading] = useState(false);

  const createPayment = async (
    appointmentData: AppointmentData,
    servicePrice: number,
    paymentMethod: 'card' | 'pix' | 'cash'
  ) => {
    setLoading(true);
    
    try {
      console.log('Criando pagamento Mercado Pago:', {
        appointmentData,
        servicePrice,
        paymentMethod
      });

      // Para pagamento no local, criar agendamento diretamente
      if (paymentMethod === 'cash') {
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
            payment_status: 'pending',
            payment_method: 'cash'
          }])
          .select(`
            *,
            services (name, price),
            barbers (name)
          `)
          .single();

        if (error) {
          console.error('Erro ao criar agendamento:', error);
          throw error;
        }

        toast.success('Agendamento criado! Pagamento será feito no local.');
        return { 
          success: true, 
          type: 'cash',
          appointment
        };
      }

      // Para PIX e cartão, usar Mercado Pago
      const { data, error } = await supabase.functions.invoke('create-mercadopago-payment', {
        body: {
          appointmentData,
          servicePrice,
          paymentMethod
        }
      });

      if (error) {
        console.error('Erro na função Mercado Pago:', error);
        throw error;
      }

      if (data?.url) {
        console.log('URL de pagamento criada:', data.url);
        // Abrir Mercado Pago em nova aba
        window.open(data.url, '_blank');
        return { 
          success: true, 
          type: 'online',
          url: data.url
        };
      } else {
        throw new Error('URL de pagamento não retornada');
      }

    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPayment,
    loading
  };
};
