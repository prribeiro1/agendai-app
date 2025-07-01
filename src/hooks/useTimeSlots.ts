
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
      // Verificar se é um dia válido (terça a domingo - 2 a 0)
      const selectedDate = new Date(appointmentDate + 'T00:00:00');
      const dayOfWeek = selectedDate.getDay(); // 0 = domingo, 1 = segunda, etc.
      
      if (dayOfWeek === 1) { // Segunda-feira
        console.log('Segunda-feira não é um dia de funcionamento');
        setAvailableTimeSlots([]);
        return;
      }

      console.log('Verificando horários disponíveis para:', {
        barber_id: barberId,
        date: appointmentDate,
        dayOfWeek: dayOfWeek
      });

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

      console.log('Agendamentos existentes encontrados:', existingAppointments);

      const occupiedTimes = existingAppointments
        .map(apt => {
          const timeStr = apt.appointment_time;
          if (timeStr.includes(':')) {
            return timeStr.slice(0, 5);
          }
          return timeStr;
        })
        .filter(time => time && time.length === 5);

      const available = allTimeSlots.filter(time => !occupiedTimes.includes(time));
      
      console.log('Horários ocupados:', occupiedTimes);
      console.log('Horários disponíveis:', available);
      
      setAvailableTimeSlots(available);

    } catch (error) {
      console.error('Erro ao verificar horários:', error);
      setAvailableTimeSlots(allTimeSlots);
    }
  };

  const isValidDate = (dateString: string) => {
    const selectedDate = new Date(dateString + 'T00:00:00');
    const dayOfWeek = selectedDate.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Não pode ser segunda-feira (1) e não pode ser no passado
    return dayOfWeek !== 1 && selectedDate >= today;
  };

  return {
    availableTimeSlots,
    isValidDate,
    refreshTimeSlots: checkAvailableTimeSlots
  };
};
