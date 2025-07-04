
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, User, Phone, Mail, FileText, CheckCircle, XCircle, History, VolumeX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  no_talk?: boolean;
  services: {
    name: string;
    price: number;
    duration: number;
  };
  barbers: {
    name: string;
  };
}

interface AppointmentsManagerProps {
  barbershopId: string;
}

export const AppointmentsManager: React.FC<AppointmentsManagerProps> = ({ barbershopId }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (barbershopId) {
      loadAppointments();
    }
  }, [barbershopId]);

  const loadAppointments = async () => {
    try {
      console.log('Carregando agendamentos para barbershop_id:', barbershopId);
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          client_name,
          client_phone,
          client_email,
          appointment_date,
          appointment_time,
          status,
          notes,
          no_talk,
          services (
            name,
            price,
            duration
          ),
          barbers (
            name
          )
        `)
        .eq('barbershop_id', barbershopId)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) {
        console.error('Erro ao carregar agendamentos:', error);
        toast.error('Erro ao carregar agendamentos: ' + error.message);
      } else {
        console.log('Agendamentos carregados:', data);
        // Automaticamente mover agendamentos passados para histórico
        const today = new Date().toISOString().split('T')[0];
        const updatedAppointments = data?.map(appointment => {
          if (appointment.appointment_date < today && appointment.status === 'confirmado') {
            return { ...appointment, status: 'concluido' };
          }
          return appointment;
        }) || [];
        
        // Atualizar no banco os que foram alterados
        const toUpdate = updatedAppointments.filter((apt, index) => 
          data && apt.status !== data[index].status
        );
        
        for (const apt of toUpdate) {
          await supabase
            .from('appointments')
            .update({ status: 'concluido' })
            .eq('id', apt.id);
        }
        
        setAppointments(updatedAppointments);
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar agendamentos:', error);
      toast.error('Erro inesperado ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        toast.error('Erro ao atualizar status: ' + error.message);
      } else {
        toast.success(`Agendamento ${newStatus === 'confirmado' ? 'confirmado' : 'cancelado'}!`);
        await loadAppointments();
      }
    } catch (error) {
      console.error('Erro inesperado ao atualizar status:', error);
      toast.error('Erro inesperado ao atualizar status');
    }
  };

  const clearHistory = async () => {
    if (!window.confirm('Tem certeza que deseja limpar todo o histórico? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('barbershop_id', barbershopId)
        .in('status', ['cancelado', 'concluido']);

      if (error) {
        console.error('Erro ao limpar histórico:', error);
        toast.error('Erro ao limpar histórico: ' + error.message);
      } else {
        toast.success('Histórico limpo com sucesso!');
        await loadAppointments();
      }
    } catch (error) {
      console.error('Erro inesperado ao limpar histórico:', error);
      toast.error('Erro inesperado ao limpar histórico');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmado':
        return 'default';
      case 'cancelado':
        return 'destructive';
      case 'concluido':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Separar agendamentos atuais (hoje e futuros) dos antigos
  const today = new Date().toISOString().split('T')[0];
  
  const currentAppointments = appointments.filter(appt => {
    const appointmentDate = appt.appointment_date;
    return appointmentDate >= today && appt.status !== 'cancelado' && appt.status !== 'concluido';
  });

  const historyAppointments = appointments.filter(appt => {
    const appointmentDate = appt.appointment_date;
    return appointmentDate < today || appt.status === 'cancelado' || appt.status === 'concluido';
  });

  const todayAppointments = appointments.filter(
    appt => appt.appointment_date === today && appt.status === 'confirmado'
  );

  const upcomingAppointments = appointments.filter(
    appt => new Date(appt.appointment_date + 'T00:00:00') > new Date(today + 'T00:00:00') && appt.status === 'confirmado'
  );

  const AppointmentCard = ({ appointment, showActions = true }: { appointment: Appointment, showActions?: boolean }) => (
    <div key={appointment.id} className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
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
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(appointment.appointment_date)}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(appointment.appointment_time)}
            </div>
          </div>
        </div>
        {showActions && appointment.status !== 'cancelado' && appointment.status !== 'concluido' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateAppointmentStatus(appointment.id, 'confirmado')}
              disabled={appointment.status === 'confirmado'}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => updateAppointmentStatus(appointment.id, 'cancelado')}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 text-gray-500" />
            <span>{appointment.client_phone}</span>
          </div>
          {appointment.client_email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3 text-gray-500" />
              <span>{appointment.client_email}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <div>
            <strong>Serviço:</strong> {appointment.services?.name}
          </div>
          <div>
            <strong>Especialista:</strong> {appointment.barbers?.name}
          </div>
          <div>
            <strong>Preço:</strong> R$ {appointment.services?.price?.toFixed(2)}
          </div>
        </div>
      </div>

      {appointment.notes && (
        <div className="flex items-start gap-2 text-sm">
          <FileText className="h-3 w-3 text-gray-500 mt-0.5" />
          <span className="text-gray-600">{appointment.notes}</span>
        </div>
      )}

      {appointment.no_talk && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
          <div className="flex items-center gap-2 text-orange-700 text-sm font-medium">
            <VolumeX className="h-4 w-4" />
            Cliente prefere não conversar durante o atendimento
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando agendamentos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hoje</p>
                <p className="text-2xl font-bold text-blue-600">{todayAppointments.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Próximos</p>
                <p className="text-2xl font-bold text-green-600">{upcomingAppointments.length}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-purple-600">{appointments.length}</p>
              </div>
              <User className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas para Agendamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Atuais ({currentAppointments.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico ({historyAppointments.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="current" className="mt-6">
              {currentAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhum agendamento atual</p>
                  <p className="text-sm">Os próximos agendamentos aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentAppointments.map((appointment) => (
                    <AppointmentCard 
                      key={appointment.id} 
                      appointment={appointment} 
                      showActions={true}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="history" className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Histórico de Agendamentos</h3>
                {historyAppointments.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearHistory}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Histórico
                  </Button>
                )}
              </div>
              
              {historyAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhum histórico</p>
                  <p className="text-sm">Agendamentos passados aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyAppointments.map((appointment) => (
                    <AppointmentCard 
                      key={appointment.id} 
                      appointment={appointment} 
                      showActions={false}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
