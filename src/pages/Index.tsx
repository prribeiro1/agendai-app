
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, MessageSquare, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const services = [
  { name: 'Corte de Cabelo', price: 'R$ 30', duration: '30 min' },
  { name: 'Acabamento de Barba', price: 'R$ 20', duration: '20 min' },
  { name: 'Corte + Barba', price: 'R$ 45', duration: '45 min' }
];

const barbers = ['João Silva', 'Pedro Santos', 'Qualquer Disponível'];
const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

interface Appointment {
  id: number;
  date: string;
  time: string;
  service: string;
  barber: string;
  name: string;
  phone: string;
  notes: string;
  status: 'Confirmado' | 'Cancelado';
}

const Index = () => {
  const [view, setView] = useState<'booking' | 'dashboard'>('booking');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    service: '',
    barber: '',
    name: '',
    phone: '',
    notes: ''
  });

  useEffect(() => {
    const stored = localStorage.getItem('barbershop-appointments');
    if (stored) {
      setAppointments(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('barbershop-appointments', JSON.stringify(appointments));
  }, [appointments]);

  const handleInputChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!form.name || !form.phone || !form.service || !form.time || !form.barber) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return false;
    }
    if (!/^\d{10,11}$/.test(form.phone.replace(/\D/g, ''))) {
      toast.error('Número de telefone inválido.');
      return false;
    }
    return true;
  };

  const bookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const isBooked = appointments.some(
      (appt) => appt.date === form.date && appt.time === form.time && appt.barber === form.barber && appt.status === 'Confirmado'
    );

    if (isBooked) {
      toast.error('Este horário já está reservado.');
      return;
    }

    const newAppointment: Appointment = {
      ...form,
      status: 'Confirmado',
      id: Date.now()
    };

    setAppointments(prev => [...prev, newAppointment]);
    toast.success(`Agendamento confirmado para ${form.name}!`);
    
    setForm({
      date: new Date().toISOString().split('T')[0],
      time: '',
      service: '',
      barber: '',
      name: '',
      phone: '',
      notes: ''
    });
  };

  const cancelAppointment = (id: number) => {
    if (window.confirm('Deseja cancelar este agendamento?')) {
      setAppointments(prev => 
        prev.map(appt => 
          appt.id === id ? { ...appt, status: 'Cancelado' } : appt
        )
      );
      toast.success('Agendamento cancelado.');
    }
  };

  const availableTimes = timeSlots.filter(
    (time) => !appointments.some(
      (appt) => appt.date === form.date && appt.time === time && appt.barber === form.barber && appt.status === 'Confirmado'
    )
  );

  const sendWhatsAppMessage = () => {
    const selectedService = services.find(s => s.name === form.service);
    const message = `Olá! Seu agendamento está confirmado:
📅 Data: ${new Date(form.date).toLocaleDateString('pt-BR')}
⏰ Horário: ${form.time}
✂️ Serviço: ${form.service} (${selectedService?.price})
👨‍💼 Barbeiro: ${form.barber}
📍 Endereço: Rua da Barbearia, 123

Obrigado pela preferência!`;
    
    const whatsappUrl = `https://wa.me/55${form.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const todayAppointments = appointments.filter(
    appt => appt.date === new Date().toISOString().split('T')[0] && appt.status === 'Confirmado'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <Calendar className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">AgendeME</h1>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setView('booking')}
              variant={view === 'booking' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Agendar
            </Button>
            <Button 
              onClick={() => setView('dashboard')}
              variant={view === 'dashboard' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Painel
            </Button>
          </div>
        </div>

        {view === 'booking' && (
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-xl">
              <CardHeader className="text-center bg-blue-600 text-white rounded-t-lg">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Agendar Horário
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={bookAppointment} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="date" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Data
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={form.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="time" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Horário
                      </Label>
                      <Select value={form.time} onValueChange={(value) => handleInputChange('time', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione um horário" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTimes.map((time) => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="service" className="flex items-center gap-2">
                      <Scissors className="h-4 w-4" />
                      Serviço
                    </Label>
                    <Select value={form.service} onValueChange={(value) => handleInputChange('service', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.name} value={service.name}>
                            <div className="flex justify-between items-center w-full">
                              <span>{service.name}</span>
                              <span className="text-sm text-gray-500 ml-4">{service.price} • {service.duration}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="barber" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Barbeiro
                    </Label>
                    <Select value={form.barber} onValueChange={(value) => handleInputChange('barber', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione um barbeiro" />
                      </SelectTrigger>
                      <SelectContent>
                        {barbers.map((barber) => (
                          <SelectItem key={barber} value={barber}>{barber}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input
                        id="name"
                        type="text"
                        value={form.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Digite seu nome"
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Telefone/WhatsApp
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="(11) 99999-9999"
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Observações (Opcional)</Label>
                    <Textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Alguma observação especial?"
                      className="mt-1"
                    />
                  </div>

                  <Button type="submit" className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700">
                    Confirmar Agendamento
                  </Button>

                  {form.name && form.phone && form.date && form.time && form.service && (
                    <Button
                      type="button"
                      onClick={sendWhatsAppMessage}
                      className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Enviar confirmação via WhatsApp
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
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
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-green-600">{appointments.filter(a => a.status === 'Confirmado').length}</p>
                    </div>
                    <User className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Cancelados</p>
                      <p className="text-2xl font-bold text-red-600">{appointments.filter(a => a.status === 'Cancelado').length}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Agendamentos</CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum agendamento ainda.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4 font-medium text-gray-900">Cliente</th>
                          <th className="text-left p-4 font-medium text-gray-900">Serviço</th>
                          <th className="text-left p-4 font-medium text-gray-900">Data/Hora</th>
                          <th className="text-left p-4 font-medium text-gray-900">Barbeiro</th>
                          <th className="text-left p-4 font-medium text-gray-900">Status</th>
                          <th className="text-left p-4 font-medium text-gray-900">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((appt) => (
                          <tr key={appt.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              <div>
                                <p className="font-medium">{appt.name}</p>
                                <p className="text-sm text-gray-500">{appt.phone}</p>
                              </div>
                            </td>
                            <td className="p-4">{appt.service}</td>
                            <td className="p-4">
                              <div>
                                <p>{new Date(appt.date).toLocaleDateString('pt-BR')}</p>
                                <p className="text-sm text-gray-500">{appt.time}</p>
                              </div>
                            </td>
                            <td className="p-4">{appt.barber}</td>
                            <td className="p-4">
                              <Badge 
                                variant={appt.status === 'Confirmado' ? 'default' : 'destructive'}
                              >
                                {appt.status === 'Confirmado' ? 'Confirmado' : 'Cancelado'}
                              </Badge>
                            </td>
                            <td className="p-4">
                              {appt.status === 'Confirmado' && (
                                <Button
                                  onClick={() => cancelAppointment(appt.id)}
                                  variant="destructive"
                                  size="sm"
                                >
                                  Cancelar
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
