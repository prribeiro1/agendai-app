import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ExternalLink, Users, Calendar, Settings, Scissors, CheckCircle, BarChart3 } from 'lucide-react';
import { SubscriptionManager } from './SubscriptionManager';
import { ServicesManager } from './ServicesManager';
import { BarbersManager } from './BarbersManager';
import { AppointmentsManager } from './AppointmentsManager';
import { ReportsManager } from './ReportsManager';
import { supabase } from '@/integrations/supabase/client';

interface BarbershopDashboardProps {
  barbershop: any;
  onUpdate: () => void;
}

interface AppointmentStats {
  todayCount: number;
  monthCount: number;
  estimatedRevenue: number;
}

export const BarbershopDashboard: React.FC<BarbershopDashboardProps> = ({ barbershop, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AppointmentStats>({
    todayCount: 0,
    monthCount: 0,
    estimatedRevenue: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const subscription = barbershop.subscriptions?.[0];
  const isSubscriptionActive = subscription?.status === 'active';

  useEffect(() => {
    if (barbershop?.id) {
      loadStats();
    }
  }, [barbershop?.id]);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

      // Buscar agendamentos de hoje
      const { data: todayAppointments, error: todayError } = await supabase
        .from('appointments')
        .select('id, services(price)')
        .eq('barbershop_id', barbershop.id)
        .eq('appointment_date', today);

      if (todayError) {
        console.error('Erro ao carregar agendamentos de hoje:', todayError);
      }

      // Buscar agendamentos do mês
      const { data: monthAppointments, error: monthError } = await supabase
        .from('appointments')
        .select('id, services(price)')
        .eq('barbershop_id', barbershop.id)
        .gte('appointment_date', startOfMonth)
        .lte('appointment_date', endOfMonth);

      if (monthError) {
        console.error('Erro ao carregar agendamentos do mês:', monthError);
      }

      // Calcular estatísticas
      const todayCount = todayAppointments?.length || 0;
      const monthCount = monthAppointments?.length || 0;
      const estimatedRevenue = monthAppointments?.reduce((total, appointment) => {
        return total + (appointment.services?.price || 0);
      }, 0) || 0;

      setStats({
        todayCount,
        monthCount,
        estimatedRevenue
      });
    } catch (error) {
      console.error('Erro inesperado ao carregar estatísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status da Assinatura - Com feedback melhorado */}
      <Card className={isSubscriptionActive ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isSubscriptionActive ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <CreditCard className="h-5 w-5 text-blue-600" />
            )}
            {isSubscriptionActive ? 'Assinatura Ativa' : 'Modo Teste Gratuito'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <Badge variant={isSubscriptionActive ? 'default' : 'secondary'} className="mb-2">
                {isSubscriptionActive ? 'Plano Premium Ativo' : 'Modo Teste - Grátis'}
              </Badge>
              
              {subscription?.current_period_end && isSubscriptionActive ? (
                <p className="text-sm text-gray-600">
                  Próxima cobrança: {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    Você está usando o modo teste gratuito.
                  </p>
                  <p className="text-xs text-gray-500">
                    Todas as funcionalidades estão disponíveis. Assine para suporte prioritário.
                  </p>
                </div>
              )}
            </div>
            <SubscriptionManager barbershop={barbershop} onUpdate={onUpdate} />
          </div>
        </CardContent>
      </Card>

      {/* Link Público */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Página de Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-3">
                Compartilhe este link com seus clientes para que possam agendar online:
              </p>
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="font-mono text-sm break-all">
                  {window.location.origin}/agendar/{barbershop.slug}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => window.open(`/agendar/${barbershop.slug}`, '_blank')}
              variant="outline"
              className="w-full lg:w-auto"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Página
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navegação */}
      <div className="flex flex-wrap gap-2 border-b">
        <Button 
          variant={activeTab === 'appointments' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('appointments')}
          size="sm"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Agendamentos
        </Button>
        <Button 
          variant={activeTab === 'reports' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('reports')}
          size="sm"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Relatórios
        </Button>
        <Button 
          variant={activeTab === 'services' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('services')}
          size="sm"
        >
          <Scissors className="h-4 w-4 mr-2" />
          Serviços
        </Button>
        <Button 
          variant={activeTab === 'barbers' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('barbers')}
          size="sm"
        >
          <Users className="h-4 w-4 mr-2" />
          Barbeiros
        </Button>
        <Button 
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('settings')}
          size="sm"
        >
          <Settings className="h-4 w-4 mr-2" />
          Configurações
        </Button>
      </div>

      {/* Conteúdo das abas */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          {/* Estatísticas dos agendamentos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Agendamentos Hoje</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {loadingStats ? '...' : stats.todayCount}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total do Mês</p>
                    <p className="text-2xl font-bold text-green-600">
                      {loadingStats ? '...' : stats.monthCount}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Receita Estimada</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {loadingStats ? '...' : `R$ ${stats.estimatedRevenue.toFixed(2)}`}
                    </p>
                  </div>
                  <CreditCard className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <AppointmentsManager barbershopId={barbershop.id} />
        </div>
      )}

      {activeTab === 'reports' && (
        <ReportsManager barbershopId={barbershop.id} />
      )}

      {activeTab === 'services' && (
        <ServicesManager barbershopId={barbershop.id} />
      )}

      {activeTab === 'barbers' && (
        <BarbersManager barbershopId={barbershop.id} />
      )}

      {activeTab === 'settings' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  🎉 {isSubscriptionActive ? 'Assinatura Premium Ativa' : 'Modo Teste Ativo'}
                </h3>
                <p className="text-blue-700 mb-4">
                  {isSubscriptionActive 
                    ? 'Você tem acesso completo a todas as funcionalidades e suporte prioritário.'
                    : 'Todas as funcionalidades estão disponíveis gratuitamente para teste. Quando estiver satisfeito, você pode ativar a assinatura.'
                  }
                </p>
              </div>
              <SubscriptionManager barbershop={barbershop} onUpdate={onUpdate} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
