
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, User, Clock, MessageSquare, VolumeX, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Barber {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  appointment_time: string;
  client_name: string;
  client_phone: string;
  no_talk: boolean;
  services: {
    name: string;
  };
  status: string;
}

interface BarberAgendaProps {
  barbershopId: string;
}

// Gerar horários de 9h às 20h, de 45 em 45 minutos
const generateTimeSlots = () => {
  const slots = [];
  const startHour = 9;
  const endHour = 20;
  
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:45`);
  }
  
  return slots;
};

export const BarberAgenda: React.FC<BarberAgendaProps> = ({ barbershopId }) => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    if (barbershopId) {
      loadBarbers();
    }
  }, [barbershopId]);

  useEffect(() => {
    if (selectedBarber && selectedDate) {
      loadAppointments();
    }
  }, [selectedBarber, selectedDate]);

  const loadBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Erro ao carregar barbeiros:', error);
        toast.error('Erro ao carregar barbeiros');
        return;
      }

      setBarbers(data || []);
      if (data && data.length > 0) {
        setSelectedBarber(data[0].id);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          client_name,
          client_phone,
          no_talk,
          status,
          services(name)
        `)
        .eq('barbershop_id', barbershopId)
        .eq('barber_id', selectedBarber)
        .eq('appointment_date', selectedDate)
        .order('appointment_time');

      if (error) {
        console.error('Erro ao carregar agendamentos:', error);
        toast.error('Erro ao carregar agendamentos');
        return;
      }

      setAppointments(data || []);
    } catch (error) {
      console.error('Erro inesperado:', error);
    }
  };

  const getAppointmentForTime = (time: string) => {
    return appointments.find(apt => apt.appointment_time === time);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'bg-green-100 text-green-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      case 'concluido':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando agenda...</div>
        </CardContent>
      </Card>
    );
  }

  if (barbers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhum barbeiro cadastrado</p>
            <p className="text-sm">Cadastre barbeiros para visualizar a agenda.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agenda do Barbeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Barbeiro
              </label>
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Visualizando agenda para <strong>{formatDate(selectedDate)}</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Grade de horários */}
      <Card>
        <CardHeader>
          <CardTitle>Horários de Atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {timeSlots.map((time) => {
              const appointment = getAppointmentForTime(time);
              
              return (
                <div
                  key={time}
                  className={`p-3 rounded-lg border ${
                    appointment 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{time}</span>
                      </div>
                      
                      {appointment && (
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status}
                          </Badge>
                          {appointment.no_talk && (
                            <VolumeX className="h-4 w-4 text-gray-500" title="Cliente prefere não conversar" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {appointment && (
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-gray-500" />
                        <span className="font-medium">{appointment.client_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-600">{appointment.client_phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-600">{appointment.services.name}</span>
                      </div>
                    </div>
                  )}
                  
                  {!appointment && (
                    <div className="mt-1 text-sm text-gray-500">
                      Horário livre
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
