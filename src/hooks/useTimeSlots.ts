
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
      
      // Verificar se é um dia válido (terça a domingo - 2 a 0)
      const selectedDate = new Date(appointmentDate + 'T00:00:00');
      const dayOfWeek = selectedDate.getDay(); // 0 = domingo, 1 = segunda, etc.
      
      console.log('Data selecionada:', appointmentDate);
      console.log('Dia da semana:', dayOfWeek);
      
      if (dayOfWeek === 1) { // Segunda-feira
        console.log('Segunda-feira não é um dia de funcionamento');
        setAvailableTimeSlots([]);
        return;
      }

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

      const available = allTimeSlots.filter(time => !occupiedTimes.includes(time));
      
      setAvailableTimeSlots(available);

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
    
    // Não pode ser segunda-feira (1) e não pode ser no passado
    return dayOfWeek !== 1 && selectedDate >= today;
  };

  return {
    availableTimeSlots,
    isValidDate,
    refreshTimeSlots: checkAvailableTimeSlots,
    allTimeSlots
  };
};
