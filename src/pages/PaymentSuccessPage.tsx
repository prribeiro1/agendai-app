
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, XCircle, Calendar, User, Scissors, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('processing');

  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentId) {
        setPaymentStatus('error');
        setLoading(false);
        return;
      }

      try {
        console.log('Verificando pagamento MercadoPago:', paymentId);
        
        const { data, error } = await supabase.functions.invoke('verify-mercadopago-payment', {
          body: { paymentId }
        });

        if (error) {
          console.error('Erro ao verificar pagamento:', error);
          setPaymentStatus('error');
          toast.error('Erro ao verificar pagamento');
        } else if (data.success) {
          setPaymentStatus('success');
          setAppointment(data.appointment);
          toast.success('Agendamento confirmado com sucesso!');
        } else {
          setPaymentStatus(data.status || 'pending');
          toast.info(`Status do pagamento: ${data.status}`);
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        setPaymentStatus('error');
        toast.error('Erro ao verificar pagamento');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [paymentId]);

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'success':
      case 'approved':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'pending':
      case 'in_process':
        return <Clock className="h-16 w-16 text-yellow-500" />;
      default:
        return <XCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'success':
      case 'approved':
        return {
          title: 'Pagamento Aprovado!',
          description: 'Seu agendamento foi confirmado com sucesso.',
          color: 'text-green-600'
        };
      case 'pending':
        return {
          title: 'Pagamento Pendente',
          description: 'Seu pagamento está sendo processado. Você receberá uma confirmação em breve.',
          color: 'text-yellow-600'
        };
      case 'in_process':
        return {
          title: 'Pagamento em Processamento',
          description: 'Estamos verificando seu pagamento. Aguarde alguns instantes.',
          color: 'text-blue-600'
        };
      default:
        return {
          title: 'Erro no Pagamento',
          description: 'Houve um problema com seu pagamento. Tente novamente.',
          color: 'text-red-600'
        };
    }
  };

  const statusInfo = getStatusMessage();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando pagamento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className={`text-2xl ${statusInfo.color}`}>
            {statusInfo.title}
          </CardTitle>
          <p className="text-gray-600">{statusInfo.description}</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {appointment && (
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Detalhes do Agendamento
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-500">Data e Hora</p>
                    <p className="font-medium">
                      {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')} às {appointment.appointment_time}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Scissors className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-500">Serviço</p>
                    <p className="font-medium">{appointment.services?.name}</p>
                    <p className="text-sm text-green-600">R$ {appointment.services?.price}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-500">Barbeiro</p>
                    <p className="font-medium">{appointment.barbers?.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-500">Cliente</p>
                    <p className="font-medium">{appointment.client_name}</p>
                    <p className="text-sm text-gray-500">{appointment.client_phone}</p>
                  </div>
                </div>
              </div>
              
              {appointment.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500">Observações</p>
                  <p className="text-gray-700">{appointment.notes}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
            >
              Voltar ao Início
            </Button>
            
            {paymentStatus === 'success' || paymentStatus === 'approved' ? (
              <Button 
                onClick={() => {
                  const message = `Olá! Meu agendamento foi confirmado:\n📅 ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')} às ${appointment.appointment_time}\n✂️ ${appointment.services?.name}\n👨‍💼 ${appointment.barbers?.name}\n\nObrigado!`;
                  const phone = appointment.client_phone.replace(/\D/g, '');
                  window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Confirmar via WhatsApp
              </Button>
            ) : (
              <Button 
                onClick={() => navigate(-1)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Tentar Novamente
              </Button>
            )}
          </div>
          
          <div className="text-center text-sm text-gray-500">
            <p>💳 Pagamento processado pelo Mercado Pago</p>
            <p>📱 Você receberá uma confirmação por email/SMS</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccessPage;
