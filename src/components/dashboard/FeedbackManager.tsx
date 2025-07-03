
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Star, Calendar, User, Filter } from 'lucide-react';
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

interface FeedbackManagerProps {
  barbershopId: string;
}

export const FeedbackManager: React.FC<FeedbackManagerProps> = ({ barbershopId }) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  useEffect(() => {
    if (barbershopId) {
      loadFeedbacks();
    }
  }, [barbershopId]);

  const loadFeedbacks = async () => {
    try {
      // Como a tabela feedbacks ainda não foi criada, vamos mostrar uma mensagem
      setFeedbacks([]);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar feedbacks:', error);
      toast.error('Erro ao carregar avaliações');
      setLoading(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const ratingMatch = filterRating === 'all' || feedback.rating.toString() === filterRating;
    const monthMatch = filterMonth === 'all' || 
      new Date(feedback.appointment_date).toISOString().slice(0, 7) === filterMonth;
    return ratingMatch && monthMatch;
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getAverageRating = () => {
    if (feedbacks.length === 0) return 0;
    const sum = feedbacks.reduce((acc, feedback) => acc + feedback.rating, 0);
    return (sum / feedbacks.length).toFixed(1);
  };

  const getRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach(feedback => {
      distribution[feedback.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const ratingDistribution = getRatingDistribution();

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
                <p className="text-sm font-medium text-gray-600">Total de Avaliações</p>
                <p className="text-2xl font-bold text-blue-600">{feedbacks.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Média de Avaliação</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-yellow-600">{getAverageRating()}</p>
                  <div className="flex">
                    {renderStars(Math.round(Number(getAverageRating())))}
                  </div>
                </div>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avaliações 5 Estrelas</p>
                <p className="text-2xl font-bold text-green-600">{ratingDistribution[5]}</p>
              </div>
              <div className="flex">
                {renderStars(5)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filtrar por Nota</label>
              <Select value={filterRating} onValueChange={setFilterRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as notas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as notas</SelectItem>
                  <SelectItem value="5">5 estrelas</SelectItem>
                  <SelectItem value="4">4 estrelas</SelectItem>
                  <SelectItem value="3">3 estrelas</SelectItem>
                  <SelectItem value="2">2 estrelas</SelectItem>
                  <SelectItem value="1">1 estrela</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Filtrar por Mês</label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  <SelectItem value={new Date().toISOString().slice(0, 7)}>Este mês</SelectItem>
                  <SelectItem value={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7)}>Mês passado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Feedbacks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Avaliações dos Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFeedbacks.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Nenhuma avaliação encontrada</p>
              <p className="text-sm text-gray-400 mt-2">
                As avaliações dos clientes aparecerão aqui após os atendimentos
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFeedbacks.map((feedback) => (
                <div key={feedback.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{feedback.client_name}</p>
                        <p className="text-sm text-gray-600">
                          {feedback.service_name} • {feedback.barber_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {renderStars(feedback.rating)}
                      </div>
                      <Badge variant="outline">
                        {feedback.rating}/5
                      </Badge>
                    </div>
                  </div>
                  
                  {feedback.comment && (
                    <p className="text-gray-700 mb-3">{feedback.comment}</p>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(feedback.appointment_date).toLocaleDateString('pt-BR')}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(feedback.created_at).toLocaleDateString('pt-BR')}
                    </span>
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
