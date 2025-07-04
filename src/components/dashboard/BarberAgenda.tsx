
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, Phone, VolumeX, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useTimeSlots } from '@/hooks/useTimeSlots';

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  no_talk?: boolean;
  services: {
    name: string;
    duration: number;
  };
}

interface Barber {
  id: string;
  name: string;
}

interface BarberAgendaProps {
  barbershopId: string;
}

export const BarberAgenda: React.FC<BarberAgendaProps> = ({ barbershopId }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  const { allTimeSlots } = useTimeSlots(selectedBarber, selectedDate);

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
        console.error('Erro ao carregar especialistas:', error);
        toast.error('Erro ao carregar especialistas');
      } else {
        setBarbers(data || []);
        if (data && data.length > 0 && !selectedBarber) {
          setSelectedBarber(data[0].id);
        }
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar especialistas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    if (!selectedBarber || !selectedDate) return;
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          client_name,
          client_phone,
          appointment_date,
          appointment_time,
          status,
          notes,
          no_talk,
          services (
            name,
            duration
          )
        `)
        .eq('barbershop_id', barbershopId)
        .eq('barber_id', selectedBarber)
        .eq('appointment_date', selectedDate)
        .neq('status', 'cancelado')
        .order('appointment_time');

      if (error) {
        console.error('Erro ao carregar agendamentos:', error);
        toast.error('Erro ao carregar agenda');
      } else {
        setAppointments(data || []);
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar agenda:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmado':
        return 'default';
      case 'concluido':
        return 'secondary';
      default:
        return 'outline';
    }
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
            <p className="text-lg font-medium mb-2">Nenhum especialista cadastrado</p>
            <p className="text-sm">Cadastre especialistas para visualizar suas agendas.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros da Agenda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Especialista</label>
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um especialista" />
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
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agenda do Dia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agenda - {formatDate(selectedDate)}
          </CardTitle>
          <p className="text-sm text-gray-600">
            Especialista: {barbers.find(b => b.id === selectedBarber)?.name}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allTimeSlots.map((timeSlot) => {
              const appointment = appointments.find(apt => apt.appointment_time.slice(0, 5) === timeSlot);
              
              return (
                <div key={timeSlot} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="w-16 text-sm font-medium text-gray-600">
                    {timeSlot}
                  </div>
                  
                  {appointment ? (
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{appointment.client_name}</span>
                            <Badge variant={getStatusColor(appointment.status)}>
                              {appointment.status}
                            </Badge>
                            {appointment.no_talk && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600 flex items-center gap-1">
                                <VolumeX className="h-3 w-3" />
                                Não conversar
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {appointment.client_phone}
                            </div>
                            <span>• {appointment.services?.name}</span>
                            <span>• {appointment.services?.duration}min</span>
                          </div>
                          {appointment.notes && (
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Obs:</strong> {appointment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 text-gray-400 italic">
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
