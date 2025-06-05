import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Scissors, Clock, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentMethodSelector } from '@/components/booking/PaymentMethodSelector';

interface Barbershop {
  id: string;
  name: string;
  slug: string;
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
  photo_url?: string;
}

const BookingPage = () => {
  const { slug } = useParams();
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
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
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const allTimeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  useEffect(() => {
    if (slug) {
      loadBarbershopData();
    }
  }, [slug]);

  useEffect(() => {
    if (form.barber_id && form.appointment_date && barbershop) {
      checkAvailableTimeSlots();
    }
  }, [form.barber_id, form.appointment_date, barbershop]);

  const loadBarbershopData = async () => {
    try {
      console.log('Carregando dados da barbearia com slug:', slug);
      
      // Carregar dados da barbearia
      const { data: barbershopData, error: barbershopError } = await supabase
        .from('barbershops')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (barbershopError || !barbershopData) {
        console.error('Erro ao carregar barbearia:', barbershopError);
        toast.error('Barbearia não encontrada ou inativa');
        setLoading(false);
        return;
      }

      console.log('Barbearia carregada:', barbershopData);
      setBarbershop(barbershopData);

      // Carregar serviços
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barbershopData.id)
        .eq('is_active', true);

      if (servicesError) {
        console.error('Erro ao carregar serviços:', servicesError);
      } else {
        console.log('Serviços carregados:', servicesData);
        setServices(servicesData || []);
      }

      // Carregar barbeiros
      const { data: barbersData, error: barbersError } = await supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', barbershopData.id)
        .eq('is_active', true);

      if (barbersError) {
        console.error('Erro ao carregar barbeiros:', barbersError);
      } else {
        console.log('Barbeiros carregados:', barbersData);
        setBarbers(barbersData || []);
      }

    } catch (error) {
      console.error('Erro inesperado ao carregar dados:', error);
      toast.error('Erro inesperado ao carregar dados da barbearia');
    } finally {
      setLoading(false);
    }
  };

  const checkAvailableTimeSlots = async () => {
    try {
      console.log('Verificando horários disponíveis para:', {
        barber_id: form.barber_id,
        date: form.appointment_date
      });

      // Buscar agendamentos existentes para o barbeiro na data selecionada
      const { data: existingAppointments, error } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('barber_id', form.barber_id)
        .eq('appointment_date', form.appointment_date)
        .neq('status', 'cancelado');

      if (error) {
        console.error('Erro ao verificar agendamentos:', error);
        setAvailableTimeSlots(allTimeSlots);
        return;
      }

      // Filtrar horários já ocupados
      const occupiedTimes = existingAppointments.map(apt => apt.appointment_time.slice(0, 5));
      const available = allTimeSlots.filter(time => !occupiedTimes.includes(time));
      
      console.log('Horários ocupados:', occupiedTimes);
      console.log('Horários disponíveis:', available);
      
      setAvailableTimeSlots(available);

      // Se o horário selecionado não está mais disponível, limpar a seleção
      if (form.appointment_time && !available.includes(form.appointment_time)) {
        setForm(prev => ({ ...prev, appointment_time: '' }));
      }

    } catch (error) {
      console.error('Erro ao verificar horários:', error);
      setAvailableTimeSlots(allTimeSlots);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barbershop) {
      toast.error('Dados da barbearia não encontrados');
      return;
    }

    // Validar campos obrigatórios
    if (!form.service_id || !form.barber_id || !form.appointment_time || !form.client_name || !form.client_phone) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const selectedService = services.find(s => s.id === form.service_id);
    if (!selectedService) {
      toast.error('Serviço não encontrado');
      return;
    }

    // Se o serviço tem preço, mostrar opções de pagamento
    if (selectedService.price > 0) {
      setShowPaymentOptions(true);
    } else {
      // Serviço gratuito, criar agendamento diretamente
      await createFreeAppointment();
    }
  };

  const createFreeAppointment = async () => {
    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('appointments')
        .insert([{
          barbershop_id: barbershop.id,
          service_id: form.service_id,
          barber_id: form.barber_id,
          appointment_date: form.appointment_date,
          appointment_time: form.appointment_time,
          client_name: form.client_name,
          client_phone: form.client_phone,
          client_email: form.client_email || null,
          notes: form.notes || null,
          payment_status: 'free',
          payment_method: 'free'
        }]);

      if (error) {
        console.error('Erro ao agendar:', error);
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
        setShowPaymentOptions(false);
        await checkAvailableTimeSlots();
      }
    } catch (error) {
      console.error('Erro inesperado ao agendar:', error);
      toast.error('Erro inesperado ao agendar');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentMethodSelect = async (method: 'card' | 'pix' | 'cash') => {
    const selectedService = services.find(s => s.id === form.service_id);
    const selectedBarber = barbers.find(b => b.id === form.barber_id);
    
    if (!selectedService || !selectedBarber) {
      toast.error('Dados do agendamento incompletos');
      return;
    }

    if (method === 'cash') {
      // Pagamento no local, criar agendamento sem pagamento online
      await createCashAppointment();
      return;
    }

    try {
      setProcessingPayment(true);
      
      const appointmentData = {
        barbershop_id: barbershop.id,
        barbershop_slug: barbershop.slug,
        service_id: form.service_id,
        service_name: selectedService.name,
        barber_id: form.barber_id,
        barber_name: selectedBarber.name,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        client_name: form.client_name,
        client_phone: form.client_phone,
        client_email: form.client_email,
        notes: form.notes
      };

      console.log('Criando sessão de pagamento:', { appointmentData, servicePrice: selectedService.price, paymentMethod: method });

      const { data, error } = await supabase.functions.invoke('create-appointment-payment', {
        body: {
          appointmentData,
          servicePrice: selectedService.price,
          paymentMethod: method
        }
      });

      if (error) {
        console.error('Erro na função create-appointment-payment:', error);
        throw error;
      }

      if (data?.url) {
        toast.success('Redirecionando para o pagamento...', {
          duration: 2000
        });
        
        setTimeout(() => {
          window.location.href = data.url;
        }, 1000);
      } else {
        throw new Error('URL de pagamento não retornada');
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error('Erro ao processar pagamento: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setProcessingPayment(false);
    }
  };

  const createCashAppointment = async () => {
    try {
      setProcessingPayment(true);

      const { error } = await supabase
        .from('appointments')
        .insert([{
          barbershop_id: barbershop.id,
          service_id: form.service_id,
          barber_id: form.barber_id,
          appointment_date: form.appointment_date,
          appointment_time: form.appointment_time,
          client_name: form.client_name,
          client_phone: form.client_phone,
          client_email: form.client_email || null,
          notes: form.notes || null,
          payment_status: 'pending',
          payment_method: 'cash'
        }]);

      if (error) {
        console.error('Erro ao agendar:', error);
        toast.error('Erro ao agendar: ' + error.message);
      } else {
        toast.success('Agendamento realizado! Pagamento será feito no local.');
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
        setShowPaymentOptions(false);
        await checkAvailableTimeSlots();
      }
    } catch (error) {
      console.error('Erro inesperado ao agendar:', error);
      toast.error('Erro inesperado ao agendar');
    } finally {
      setProcessingPayment(false);
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

  if (services.length === 0 || barbers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Agendamento Indisponível</h1>
          <p className="text-gray-600">
            {services.length === 0 && barbers.length === 0 
              ? 'Esta barbearia ainda não possui serviços nem barbeiros cadastrados.'
              : services.length === 0 
              ? 'Esta barbearia ainda não possui serviços cadastrados.'
              : 'Esta barbearia ainda não possui barbeiros cadastrados.'
            }
          </p>
        </div>
      </div>
    );
  }

  const selectedService = services.find(s => s.id === form.service_id);

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
            {!showPaymentOptions ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="service">Serviço *</Label>
                    <Select value={form.service_id} onValueChange={(value) => handleInputChange('service_id', value)} required>
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
                    <Select value={form.barber_id} onValueChange={(value) => handleInputChange('barber_id', value)} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um barbeiro" />
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
                      onChange={(e) => handleInputChange('appointment_date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <Label htmlFor="time">Horário *</Label>
                    <Select value={form.appointment_time} onValueChange={(value) => handleInputChange('appointment_time', value)} required>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !form.barber_id 
                            ? "Selecione um barbeiro primeiro" 
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
                    {form.barber_id && availableTimeSlots.length === 0 && (
                      <p className="text-sm text-red-500 mt-1">
                        Nenhum horário disponível para este barbeiro nesta data.
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
                      onChange={(e) => handleInputChange('client_name', e.target.value)}
                      placeholder="Digite seu nome"
                      required
                      disabled={submitting}
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
                      disabled={submitting}
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
                    disabled={submitting}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Alguma observação especial?"
                    disabled={submitting}
                  />
                </div>

                <div className="text-center">
                  {selectedService && (
                    <p className="text-lg font-semibold mb-4">
                      {selectedService.price > 0 
                        ? `Total: R$ ${selectedService.price.toFixed(2)}`
                        : 'Serviço Gratuito'
                      }
                    </p>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full md:w-auto px-8 py-3 text-lg" 
                    disabled={submitting || availableTimeSlots.length === 0 || !form.barber_id}
                  >
                    {submitting ? 'Processando...' : 'Continuar'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Confirme seu agendamento</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p><strong>Serviço:</strong> {selectedService?.name}</p>
                    <p><strong>Data:</strong> {new Date(form.appointment_date).toLocaleDateString('pt-BR')}</p>
                    <p><strong>Horário:</strong> {form.appointment_time}</p>
                    <p><strong>Cliente:</strong> {form.client_name}</p>
                  </div>
                </div>

                <PaymentMethodSelector
                  servicePrice={selectedService?.price || 0}
                  onPaymentMethodSelect={handlePaymentMethodSelect}
                  loading={processingPayment}
                />

                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowPaymentOptions(false)}
                    disabled={processingPayment}
                  >
                    Voltar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingPage;
