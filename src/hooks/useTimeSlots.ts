
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const allTimeSlots = [
  '09:00', '09:45', '10:30', '11:15', '12:00', '12:45', 
  '13:30', '14:15', '15:00', '15:45', '16:30', '17:15', 
  '18:00', '18:45', '19:15', '20:00'
];

export const useTimeSlots = (barberId: string, appointmentDate: string) => {
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  useEffect(() => {
    if (barberId && appointmentDate) {
      checkAvailableTimeSlots();
    }
  }, [barberId, appointmentDate]);

  const checkAvailableTimeSlots = async () => {
    try {
      console.log('=== VERIFICANDO HORÁRIOS DISPONÍVEIS ===');
      
      const selectedDate = new Date(appointmentDate + 'T00:00:00');
      const dayOfWeek = selectedDate.getDay(); // 0 = domingo, 1 = segunda, etc.
      
      console.log('Data selecionada:', appointmentDate);
      console.log('Dia da semana:', dayOfWeek);

      // Buscar barbershop_id através do barber_id
      const { data: barberData, error: barberError } = await supabase
        .from('barbers')
        .select('barbershop_id')
        .eq('id', barberId)
        .single();

      if (barberError || !barberData) {
        console.error('Erro ao buscar barbershop_id:', barberError);
        setAvailableTimeSlots([]);
        return;
      }

      // Buscar horários de funcionamento para o dia da semana
      const { data: businessHours, error: businessHoursError } = await supabase
        .from('business_hours')
        .select('open_time, close_time, is_open')
        .eq('barbershop_id', barberData.barbershop_id)
        .eq('day_of_week', dayOfWeek)
        .single();

      if (businessHoursError) {
        console.error('Erro ao buscar horários de funcionamento:', businessHoursError);
        // Se não há horários configurados, usar lógica padrão (não funciona às segundas)
        if (dayOfWeek === 1) {
          console.log('Segunda-feira não é um dia de funcionamento (padrão)');
          setAvailableTimeSlots([]);
          return;
        }
      } else {
        // Verificar se o estabelecimento está aberto no dia
        if (!businessHours.is_open) {
          console.log('Estabelecimento fechado neste dia');
          setAvailableTimeSlots([]);
          return;
        }
      }

      // Buscar agendamentos existentes
      const { data: existingAppointments, error } = await supabase
        .from('appointments')
        .select('appointment_time, status')
        .eq('barber_id', barberId)
        .eq('appointment_date', appointmentDate)
        .not('status', 'eq', 'cancelado');

      if (error) {
        console.error('Erro ao verificar agendamentos:', error);
        setAvailableTimeSlots(allTimeSlots);
        return;
      }

      const occupiedTimes = existingAppointments
        .map(apt => {
          const timeStr = apt.appointment_time;
          if (typeof timeStr === 'string') {
            return timeStr.includes(':') ? timeStr.slice(0, 5) : timeStr;
          }
          return null;
        })
        .filter(time => time && time.length === 5);

      let availableSlots = allTimeSlots.filter(time => !occupiedTimes.includes(time));

      // Filtrar horários baseado nos horários de funcionamento configurados
      if (businessHours && businessHours.open_time && businessHours.close_time) {
        const openTime = businessHours.open_time.slice(0, 5); // HH:MM format
        const closeTime = businessHours.close_time.slice(0, 5); // HH:MM format
        
        console.log('Horário de funcionamento:', openTime, 'até', closeTime);
        
        availableSlots = availableSlots.filter(time => {
          return time >= openTime && time <= closeTime;
        });
      }

      // Filtrar horários que já passaram se for o dia atual
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      
      if (appointmentDate === todayString) {
        const currentTime = today.toTimeString().slice(0, 5); // HH:MM format
        console.log('Horário atual:', currentTime);
        
        availableSlots = availableSlots.filter(time => {
          return time > currentTime;
        });
        
        console.log('Horários filtrados para hoje (após horário atual):', availableSlots);
      }
      
      console.log('Horários disponíveis:', availableSlots);
      setAvailableTimeSlots(availableSlots);

    } catch (error) {
      console.error('Erro inesperado ao verificar horários:', error);
      setAvailableTimeSlots(allTimeSlots);
    }
  };

  const isValidDate = (dateString: string) => {
    const selectedDate = new Date(dateString + 'T00:00:00');
    const dayOfWeek = selectedDate.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Não pode ser no passado
    return selectedDate >= today;
  };

  return {
    availableTimeSlots,
    isValidDate,
    refreshTimeSlots: checkAvailableTimeSlots,
    allTimeSlots
  };
};
