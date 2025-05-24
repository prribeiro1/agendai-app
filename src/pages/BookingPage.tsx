
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Scissors, Clock, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface Barbershop {
  id: string;
  name: string;
  phone: string;
  address: string;
  description: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Barber {
  id: string;
  name: string;
}

const BookingPage = () => {
  const { slug } = useParams();
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    service_id: '',
    barber_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '',
    client_name: '',
    client_phone: '',
    client_email: '',
    notes: ''
  });

  useEffect(() => {
    if (slug) {
      loadBarbershopData();
    }
  }, [slug]);

  const loadBarbershopData = async () => {
    // Carregar dados da barbearia
    const { data: barbershopData, error: barbershopError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (barbershopError || !barbershopData) {
      toast.error('Barbearia não encontrada ou inativa');
      setLoading(false);
      return;
    }

    setBarbershop(barbershopData);

    // Carregar serviços
    const { data: servicesData } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', barbershopData.id)
      .eq('is_active', true);

    if (servicesData) setServices(servicesData);

    // Carregar barbeiros
    const { data: barbersData } = await supabase
      .from('barbers')
      .select('*')
      .eq('barbershop_id', barbershopData.id)
      .eq('is_active', true);

    if (barbersData) setBarbers(barbersData);

    setLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barbershop) return;

    const { error } = await supabase
      .from('appointments')
      .insert([{
        ...form,
        barbershop_id: barbershop.id
      }]);

    if (error) {
      toast.error('Erro ao agendar: ' + error.message);
    } else {
      toast.success('Agendamento realizado com sucesso!');
      setForm({
        service_id: '',
        barber_id: '',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '',
        client_name: '',
        client_phone: '',
        client_email: '',
        notes: ''
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Scissors className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!barbershop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Barbearia não encontrada</h1>
          <p className="text-gray-600">Esta barbearia pode estar inativa ou não existir.</p>
        </div>
      </div>
    );
  }

  const selectedService = services.find(s => s.id === form.service_id);
  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header da Barbearia */}
        <Card className="mb-8">
          <CardHeader className="text-center bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Scissors className="h-8 w-8" />
              <CardTitle className="text-3xl">{barbershop.name}</CardTitle>
            </div>
            {barbershop.description && (
              <p className="text-blue-100">{barbershop.description}</p>
            )}
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {barbershop.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{barbershop.phone}</span>
                </div>
              )}
              {barbershop.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{barbershop.address}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Formulário de Agendamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Agendar Horário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="service">Serviço *</Label>
                  <Select value={form.service_id} onValueChange={(value) => handleInputChange('service_id', value)}>
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
                  <Label htmlFor="barber">Barbeiro *</Label>
                  <Select value={form.barber_id} onValueChange={(value) => handleInputChange('barber_id', value)}>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.appointment_date}
                    onChange={(e) => handleInputChange('appointment_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="time">Horário *</Label>
                  <Select value={form.appointment_time} onValueChange={(value) => handleInputChange('appointment_time', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={form.client_name}
                    onChange={(e) => handleInputChange('client_name', e.target.value)}
                    placeholder="Digite seu nome"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={form.client_phone}
                    onChange={(e) => handleInputChange('client_phone', e.target.value)}
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
                  onChange={(e) => handleInputChange('client_email', e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Alguma observação especial?"
                />
              </div>

              <div className="text-center">
                {selectedService && (
                  <p className="text-lg font-semibold mb-4">
                    Total: R$ {selectedService.price.toFixed(2)}
                  </p>
                )}
                <Button type="submit" className="w-full md:w-auto px-8 py-3 text-lg">
                  Confirmar Agendamento
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingPage;
