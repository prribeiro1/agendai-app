
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, CheckCircle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  client_name: string;
  appointment_date: string;
  appointment_time: string;
  services: {
    name: string;
  };
  barbers: {
    name: string;
  };
  barbershops: {
    id: string;
    name: string;
  };
}

const FeedbackPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (appointmentId) {
      loadAppointment();
    }
  }, [appointmentId]);

  const loadAppointment = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          client_name,
          appointment_date,
          appointment_time,
          services(name),
          barbers(name),
          barbershops(id, name)
        `)
        .eq('id', appointmentId)
        .single();

      if (error) {
        console.error('Erro ao carregar agendamento:', error);
        toast.error('Agendamento não encontrado');
        return;
      }

      // Verificar se já existe feedback para este agendamento
      const { data: existingFeedback } = await supabase
        .from('feedbacks')
        .select('id')
        .eq('appointment_id', appointmentId)
        .single();

      if (existingFeedback) {
        setSubmitted(true);
      }

      setAppointment(data);
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      toast.error('Por favor, selecione uma avaliação');
      return;
    }

    if (!appointment) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('feedbacks')
        .insert({
          barbershop_id: appointment.barbershops.id,
          appointment_id: appointmentId!,
          client_name: appointment.client_name,
          rating,
          comment: comment.trim() || null,
          appointment_date: appointment.appointment_date,
          service_name: appointment.services.name,
          barber_name: appointment.barbers.name
        });

      if (error) {
        console.error('Erro ao salvar avaliação:', error);
        toast.error('Erro ao salvar avaliação');
        return;
      }

      toast.success('Avaliação enviada com sucesso!');
      setSubmitted(true);
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <button
        key={index}
        onClick={() => setRating(index + 1)}
        className={`h-8 w-8 transition-colors ${
          index < rating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
        }`}
        disabled={submitted}
      >
        <Star className="h-full w-full fill-current" />
      </button>
    ));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">Agendamento não encontrado</p>
            <Button onClick={() => navigate('/')}>
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Obrigado pela sua avaliação!</h2>
            <p className="text-gray-600 mb-4">
              Sua opinião é muito importante para nós.
            </p>
            <Button onClick={() => navigate('/')}>
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              Avalie seu atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Detalhes do agendamento */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="font-medium text-gray-900">{appointment.barbershops.name}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Cliente:</strong> {appointment.client_name}</p>
                <p><strong>Barbeiro:</strong> {appointment.barbers.name}</p>
                <p><strong>Serviço:</strong> {appointment.services.name}</p>
                <p><strong>Data:</strong> {formatDate(appointment.appointment_date)} às {appointment.appointment_time}</p>
              </div>
            </div>

            {/* Avaliação por estrelas */}
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Como foi seu atendimento?</h3>
                <div className="flex justify-center gap-1">
                  {renderStars()}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {rating === 1 && 'Muito ruim'}
                    {rating === 2 && 'Ruim'}
                    {rating === 3 && 'Regular'}
                    {rating === 4 && 'Bom'}
                    {rating === 5 && 'Excelente'}
                  </p>
                )}
              </div>
            </div>

            {/* Comentário */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Comentário (opcional)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte-nos como foi sua experiência..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 text-right">
                {comment.length}/500
              </p>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Pular avaliação
              </Button>
              <Button
                onClick={handleSubmitFeedback}
                disabled={submitting || rating === 0}
                className="flex-1"
              >
                {submitting ? 'Enviando...' : 'Enviar avaliação'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedbackPage;
