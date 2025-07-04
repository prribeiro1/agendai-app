
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Barber {
  id: string;
  name: string;
  photo_url?: string;
}

interface FormData {
  service_id: string;
  barber_id: string;
  appointment_date: string;
  appointment_time: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  notes: string;
}

interface BookingFormProps {
  services: Service[];
  barbers: Barber[];
  form: FormData;
  availableTimeSlots: string[];
  isValidDate: (date: string) => boolean;
  onInputChange: (field: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const BookingForm = ({
  services,
  barbers,
  form,
  availableTimeSlots,
  isValidDate,
  onInputChange,
  onSubmit
}: BookingFormProps) => {
  const selectedService = services.find(s => s.id === form.service_id);
  const selectedDate = new Date(form.appointment_date + 'T00:00:00');
  const isMonday = selectedDate.getDay() === 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Agendar Horário
        </CardTitle>
        <p className="text-sm text-gray-600">
          Funcionamento: Terça a Domingo das 9h às 20h
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="service">Serviço *</Label>
              <Select value={form.service_id} onValueChange={(value) => onInputChange('service_id', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex justify-between items-center w-full">
                        <span>{service.name}</span>
                        <span className="text-sm text-gray-500 ml-4">
                          R$ {service.price.toFixed(2)} • {service.duration}min
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="barber">Especialista *</Label>
              <Select value={form.barber_id} onValueChange={(value) => onInputChange('barber_id', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um especialista" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={barber.photo_url} alt={barber.name} />
                          <AvatarFallback>
                            {barber.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{barber.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={form.appointment_date}
                onChange={(e) => onInputChange('appointment_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
              {isMonday && (
                <p className="text-sm text-red-500 mt-1">
                  Não funcionamos às segundas-feiras. Por favor, escolha outro dia.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="time">Horário *</Label>
              <Select 
                value={form.appointment_time} 
                onValueChange={(value) => onInputChange('appointment_time', value)} 
                required
                disabled={!form.barber_id || isMonday}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !form.barber_id 
                      ? "Selecione um especialista primeiro" 
                      : isMonday
                      ? "Não funcionamos às segundas"
                      : availableTimeSlots.length === 0 
                      ? "Nenhum horário disponível" 
                      : "Selecione um horário"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableTimeSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.barber_id && !isMonday && availableTimeSlots.length === 0 && (
                <p className="text-sm text-red-500 mt-1">
                  Nenhum horário disponível para este especialista nesta data.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={form.client_name}
                onChange={(e) => onInputChange('client_name', e.target.value)}
                placeholder="Digite seu nome"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={form.client_phone}
                onChange={(e) => onInputChange('client_phone', e.target.value)}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">E-mail (opcional)</Label>
            <Input
              id="email"
              type="email"
              value={form.client_email}
              onChange={(e) => onInputChange('client_email', e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => onInputChange('notes', e.target.value)}
              placeholder="Alguma observação especial?"
            />
          </div>

          <div className="text-center">
            {selectedService && (
              <p className="text-lg font-semibold mb-4">
                Total: R$ {selectedService.price.toFixed(2)}
              </p>
            )}
            <Button 
              type="submit" 
              className="w-full md:w-auto px-8 py-3 text-lg" 
              disabled={availableTimeSlots.length === 0 || !form.barber_id || isMonday}
            >
              Agendar Horário
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
