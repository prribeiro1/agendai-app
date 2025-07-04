
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BarbershopHeader } from '@/components/booking/BarbershopHeader';
import { BookingForm } from '@/components/booking/BookingForm';
import { AppointmentConfirmation } from '@/components/booking/AppointmentConfirmation';
import { useAppointmentBooking } from '@/hooks/useAppointmentBooking';
import { useBarbershopData } from '@/hooks/useBarbershopData';
import { useTimeSlots } from '@/hooks/useTimeSlots';

const BookingPage = () => {
  const { slug } = useParams();
  const [showConfirmation, setShowConfirmation] = useState(false);
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
  
  const { barbershop, services, barbers, loading } = useBarbershopData(slug);
  const { availableTimeSlots, isValidDate, refreshTimeSlots } = useTimeSlots(form.barber_id, form.appointment_date);
  const { createAppointment, loading: processingAppointment } = useAppointmentBooking();

  const handleInputChange = (field: string, value: string) => {
    console.log(`Campo alterado: ${field} = ${value}`);
    setForm(prev => {
      const newForm = { ...prev, [field]: value };
      
      // Clear appointment_time if it's no longer available
      if (field === 'barber_id' || field === 'appointment_date') {
        if (newForm.appointment_time && !availableTimeSlots.includes(newForm.appointment_time)) {
          newForm.appointment_time = '';
        }
      }
      
      return newForm;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== FORMULÁRIO SUBMETIDO ===');
    console.log('Dados do formulário:', form);
    
    if (!barbershop) {
      toast.error('Dados da barbearia não encontrados');
      return;
    }

    // Validar campos obrigatórios
    const requiredFields = ['service_id', 'barber_id', 'appointment_time', 'client_name', 'client_phone'];
    const missingFields = requiredFields.filter(field => !form[field as keyof typeof form]);
    
    if (missingFields.length > 0) {
      console.log('Campos obrigatórios faltando:', missingFields);
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Validar data
    if (!isValidDate(form.appointment_date)) {
      console.log('Data inválida:', form.appointment_date);
      toast.error('Data inválida. Não funcionamos às segundas-feiras.');
      return;
    }

    // Validar se o horário ainda está disponível
    if (!availableTimeSlots.includes(form.appointment_time)) {
      console.log('Horário não disponível:', form.appointment_time);
      toast.error('Horário selecionado não está mais disponível');
      await refreshTimeSlots();
      return;
    }

    console.log('Validações passaram, mostrando confirmação...');
    setShowConfirmation(true);
  };

  const handleConfirmAppointment = async (noTalk: boolean) => {
    console.log('=== CONFIRMANDO AGENDAMENTO ===');
    console.log('No talk:', noTalk);
    
    const selectedService = services.find(s => s.id === form.service_id);
    const selectedBarber = barbers.find(b => b.id === form.barber_id);
    
    if (!selectedService || !selectedBarber || !barbershop) {
      console.error('Dados incompletos:', { selectedService, selectedBarber, barbershop });
      toast.error('Dados do agendamento incompletos');
      return;
    }

    try {
      const appointmentData = {
        barbershop_id: barbershop.id,
        service_id: form.service_id,
        barber_id: form.barber_id,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        client_name: form.client_name,
        client_phone: form.client_phone,
        client_email: form.client_email,
        notes: form.notes,
        no_talk: noTalk
      };

      console.log('Dados para criação do agendamento:', appointmentData);

      const result = await createAppointment(appointmentData);
      
      if (result.success) {
        console.log('Agendamento criado com sucesso!');
        // Resetar formulário
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
        setShowConfirmation(false);
        await refreshTimeSlots();
      } else {
        console.error('Falha ao criar agendamento:', result.error);
      }
    } catch (error) {
      console.error('Erro inesperado ao confirmar agendamento:', error);
      toast.error('Erro inesperado ao confirmar agendamento');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
  const selectedBarber = barbers.find(b => b.id === form.barber_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto p-4 max-w-4xl">
        <BarbershopHeader barbershop={barbershop} />
        
        <BookingForm
          services={services}
          barbers={barbers}
          form={form}
          availableTimeSlots={availableTimeSlots}
          isValidDate={isValidDate}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
        />

        {/* Modal de Confirmação */}
        {showConfirmation && selectedService && selectedBarber && (
          <AppointmentConfirmation
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            appointmentData={{
              barbershop_id: barbershop.id,
              service_id: form.service_id,
              service_name: selectedService.name,
              service_price: selectedService.price,
              barber_id: form.barber_id,
              barber_name: selectedBarber.name,
              appointment_date: form.appointment_date,
              appointment_time: form.appointment_time,
              client_name: form.client_name,
              client_phone: form.client_phone,
              client_email: form.client_email,
              notes: form.notes
            }}
            onConfirm={handleConfirmAppointment}
            loading={processingAppointment}
          />
        )}
      </div>
    </div>
  );
};

export default BookingPage;
