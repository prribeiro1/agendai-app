
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Clock, User, Scissors, MapPin } from 'lucide-react';

interface AppointmentData {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  date: string;
  time: string;
  service: {
    name: string;
    price: number;
    duration: number;
  };
  barber: {
    name: string;
  };
  barbershop: {
    name: string;
    address?: string;
  };
  appointmentId?: string;
}

interface AppointmentConfirmationProps {
  appointmentData: AppointmentData;
  onClose: () => void;
}

export const AppointmentConfirmation: React.FC<AppointmentConfirmationProps> = ({
  appointmentData,
  onClose
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleFeedbackRedirect = () => {
    if (appointmentData.appointmentId) {
      window.open(`/avaliar/${appointmentData.appointmentId}`, '_blank');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <CardTitle className="text-xl text-green-700">
          Agendamento Confirmado!
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-semibold">{appointmentData.barbershop.name}</p>
              {appointmentData.barbershop.address && (
                <p className="text-sm text-gray-600">{appointmentData.barbershop.address}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-medium">{appointmentData.clientName}</p>
              <p className="text-sm text-gray-600">{appointmentData.clientPhone}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-500" />
            <p className="font-medium">{formatDate(appointmentData.date)}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-gray-500" />
            <p className="font-medium">{appointmentData.time}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Scissors className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-medium">{appointmentData.service.name}</p>
              <p className="text-sm text-gray-600">
                {appointmentData.barber.name} • R$ {appointmentData.service.price.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Importante:</strong> Chegue com 5 minutos de antecedência. 
            Em caso de cancelamento, entre em contato com pelo menos 2 horas de antecedência.
          </p>
        </div>

        <div className="space-y-2">
          <Button onClick={onClose} className="w-full">
            Finalizar
          </Button>
          
          {appointmentData.appointmentId && (
            <Button 
              onClick={handleFeedbackRedirect}
              variant="outline" 
              className="w-full"
            >
              Avaliar atendimento depois
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
