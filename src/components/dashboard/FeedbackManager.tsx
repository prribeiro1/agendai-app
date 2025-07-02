
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MessageSquare, User, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface Feedback {
  id: string;
  client_name: string;
  rating: number;
  comment?: string;
  appointment_date: string;
  service_name: string;
  barber_name: string;
  created_at: string;
}

interface FeedbackStats {
  averageRating: number;
  totalFeedbacks: number;
  ratingDistribution: { [key: number]: number };
}

interface FeedbackManagerProps {
  barbershopId: string;
}

export const FeedbackManager: React.FC<FeedbackManagerProps> = ({ barbershopId }) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({
    averageRating: 0,
    totalFeedbacks: 0,
    ratingDistribution: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (barbershopId) {
      loadFeedbacks();
    }
  }, [barbershopId]);

  const loadFeedbacks = async () => {
    try {
      console.log('Carregando feedbacks para barbershop_id:', barbershopId);
      
      const { data, error } = await supabase
        .from('feedbacks')
        .select(`
          id,
          client_name,
          rating,
          comment,
          appointment_date,
          service_name,
          barber_name,
          created_at
        `)
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar feedbacks:', error);
        toast.error('Erro ao carregar avaliações: ' + error.message);
      } else {
        console.log('Feedbacks carregados:', data);
        setFeedbacks(data || []);
        calculateStats(data || []);
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar feedbacks:', error);
      toast.error('Erro inesperado ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (feedbackData: Feedback[]) => {
    if (feedbackData.length === 0) {
      setStats({
        averageRating: 0,
        totalFeedbacks: 0,
        ratingDistribution: {}
      });
      return;
    }

    const totalRating = feedbackData.reduce((sum, feedback) => sum + feedback.rating, 0);
    const averageRating = totalRating / feedbackData.length;
    
    const ratingDistribution: { [key: number]: number } = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = feedbackData.filter(f => f.rating === i).length;
    }

    setStats({
      averageRating,
      totalFeedbacks: feedbackData.length,
      ratingDistribution
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando avaliações...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Média de Avaliação</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.averageRating.toFixed(1)}
                  </p>
                  <div className="flex">
                    {renderStars(Math.round(stats.averageRating))}
                  </div>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Avaliações</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalFeedbacks}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-3">Distribuição</p>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-2 text-xs">
                    <span>{rating}★</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{
                          width: stats.totalFeedbacks > 0 
                            ? `${((stats.ratingDistribution[rating] || 0) / stats.totalFeedbacks) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                    <span className="text-gray-500 w-6 text-right">
                      {stats.ratingDistribution[rating] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Avaliações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Avaliações dos Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feedbacks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma avaliação ainda</p>
              <p className="text-sm">As avaliações dos clientes aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((feedback) => (
                <div key={feedback.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{feedback.client_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {feedback.service_name} • {feedback.barber_name}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {formatDate(feedback.appointment_date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {renderStars(feedback.rating)}
                    </div>
                  </div>

                  {feedback.comment && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700">{feedback.comment}</p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Avaliado em {formatDate(feedback.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
