
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, User, Scissors, CheckCircle } from 'lucide-react';

interface AppointmentData {
  barbershop_id: string;
  service_id: string;
  service_name: string;
  service_price: number;
  barber_id: string;
  barber_name: string;
  appointment_date: string;
  appointment_time: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  notes?: string;
}

interface AppointmentConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentData: AppointmentData;
  onConfirm: (noTalk: boolean) => void;
  loading: boolean;
}

export const AppointmentConfirmation = ({
  isOpen,
  onClose,
  appointmentData,
  onConfirm,
  loading
}: AppointmentConfirmationProps) => {
  const [noTalk, setNoTalk] = useState(false);

  const handleConfirm = () => {
    onConfirm(noTalk);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName}, ${day} de ${month} de ${year}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Confirmar Agendamento
          </DialogTitle>
          <DialogDescription>
            Revise os detalhes do seu agendamento antes de confirmar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Detalhes do agendamento */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <Scissors className="h-4 w-4 text-blue-600" />
              <div>
                <p className="font-medium">{appointmentData.service_name}</p>
                <p className="text-sm text-gray-600">
                  R$ {appointmentData.service_price.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-blue-600" />
              <div>
                <p className="font-medium">{appointmentData.barber_name}</p>
                <p className="text-sm text-gray-600">Barbeiro</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="font-medium">{formatDate(appointmentData.appointment_date)}</p>
                <p className="text-sm text-gray-600">Data do agendamento</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <p className="font-medium">{appointmentData.appointment_time}</p>
                <p className="text-sm text-gray-600">Horário</p>
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="font-medium">{appointmentData.client_name}</p>
              <p className="text-sm text-gray-600">{appointmentData.client_phone}</p>
              {appointmentData.client_email && (
                <p className="text-sm text-gray-600">{appointmentData.client_email}</p>
              )}
            </div>

            {appointmentData.notes && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium">Observações:</p>
                <p className="text-sm text-gray-600">{appointmentData.notes}</p>
              </div>
            )}
          </div>

          {/* Preferência de conversa */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="no-talk"
                checked={noTalk}
                onCheckedChange={(checked) => setNoTalk(checked as boolean)}
              />
              <label
                htmlFor="no-talk"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Não quero conversar durante o atendimento
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2 ml-6">
              Marque esta opção se preferir um atendimento mais silencioso
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Voltar
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Confirmando...' : 'Confirmar Agendamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
