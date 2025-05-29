
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Clock, User, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      verifyPaymentAndCreateAppointment();
    } else {
      setLoading(false);
      toast.error('ID da sessão não encontrado');
    }
  }, [sessionId]);

  const verifyPaymentAndCreateAppointment = async () => {
    try {
      console.log('Verificando pagamento para sessão:', sessionId);
      
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId }
      });

      if (error) {
        console.error('Erro na verificação:', error);
        toast.error('Erro ao verificar pagamento');
        return;
      }

      if (data.success) {
        setAppointment(data.appointment);
        toast.success('Agendamento confirmado com sucesso!');
      } else {
        toast.error('Pagamento não foi confirmado');
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao verificar pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
          <p>Verificando seu pagamento...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-bold mb-4">Erro na Verificação</h1>
            <p className="text-gray-600 mb-4">
              Não foi possível verificar seu pagamento. Entre em contato com a barbearia.
            </p>
            <Button asChild>
              <Link to="/">Voltar ao Início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
      <div className="container mx-auto p-4 max-w-2xl">
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="text-center bg-green-50 rounded-t-lg">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">
              Pagamento Confirmado!
            </CardTitle>
            <p className="text-green-700">
              Seu agendamento foi realizado com sucesso
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Data</p>
                  <p className="text-gray-600">
                    {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Horário</p>
                  <p className="text-gray-600">{appointment.appointment_time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Cliente</p>
                  <p className="text-gray-600">{appointment.client_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Telefone</p>
                  <p className="text-gray-600">{appointment.client_phone}</p>
                </div>
              </div>

              {appointment.client_email && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">E-mail</p>
                    <p className="text-gray-600">{appointment.client_email}</p>
                  </div>
                </div>
              )}

              {appointment.notes && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium mb-1">Observações</p>
                  <p className="text-gray-600">{appointment.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-medium text-green-800 mb-2">Pagamento Realizado</p>
                <p className="text-sm text-green-700">
                  Método: {appointment.payment_method === 'card' ? 'Cartão de Crédito' : 'PIX'}
                </p>
                <p className="text-sm text-green-700">
                  Status: Confirmado ✅
                </p>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                Guarde este comprovante. Você pode apresentá-lo na barbearia.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => window.print()} variant="outline">
                  Imprimir Comprovante
                </Button>
                <Button asChild>
                  <Link to="/">Agendar Novamente</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
