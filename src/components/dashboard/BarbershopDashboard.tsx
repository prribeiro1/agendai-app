
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Users, Calendar, CheckCircle, BarChart3, UserCheck, Settings, Clock, AlertTriangle } from 'lucide-react';
import { SubscriptionManager } from './SubscriptionManager';
import { ServicesManager } from './ServicesManager';
import { BarbersManager } from './BarbersManager';
import { AppointmentsManager } from './AppointmentsManager';
import { ReportsManager } from './ReportsManager';
import { BarberAgenda } from './BarberAgenda';
import { BarbershopSettings } from './BarbershopSettings';
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
  const [activeTab, setActiveTab] = useState('appointments');
  const [stats, setStats] = useState<AppointmentStats>({
    todayCount: 0,
    monthCount: 0,
    estimatedRevenue: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const subscription = barbershop.subscriptions?.[0];
  const isSubscriptionActive = subscription?.status === 'active';
  const isTrial = subscription?.is_trial;
  const trialEnd = subscription?.trial_end;

  // Calcular dias restantes do trial
  const getTrialDaysLeft = () => {
    if (!isTrial || !trialEnd) return 0;
    const now = new Date();
    const end = new Date(trialEnd);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const trialDaysLeft = getTrialDaysLeft();
  const isTrialExpired = isTrial && trialDaysLeft <= 0;

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

  // Determinar o status da assinatura para exibição
  const getSubscriptionStatus = () => {
    if (isSubscriptionActive) {
      return {
        title: 'Sistema AgendAI - Plano Premium Ativo',
        badge: 'Assinatura Ativa',
        color: 'bg-green-50 border-green-200',
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        description: 'Todas as funcionalidades estão liberadas.',
        note: 'Gerencie sua assinatura através do botão ao lado.'
      };
    } else if (isTrial && !isTrialExpired) {
      return {
        title: 'Sistema AgendAI - Período de Teste Gratuito',
        badge: `Teste Gratuito - ${trialDaysLeft} dia${trialDaysLeft !== 1 ? 's' : ''} restante${trialDaysLeft !== 1 ? 's' : ''}`,
        color: 'bg-blue-50 border-blue-200',
        icon: <Clock className="h-5 w-5 text-blue-600" />,
        description: 'Todas as funcionalidades estão liberadas durante o período de teste.',
        note: 'Assine agora para continuar usando após o período de teste.'
      };
    } else {
      return {
        title: 'Sistema AgendAI - Acesso Bloqueado',
        badge: 'Período de Teste Expirado',
        color: 'bg-red-50 border-red-200',
        icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
        description: 'Seu período de teste expirou. Assine para continuar usando.',
        note: 'Assine agora para reativar todas as funcionalidades.'
      };
    }
  };

  const statusInfo = getSubscriptionStatus();

  return (
    <div className="space-y-6">
      {/* Status da Assinatura */}
      <Card className={statusInfo.color}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {statusInfo.icon}
            {statusInfo.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <Badge variant="default" className="mb-2">
                {statusInfo.badge}
              </Badge>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  {statusInfo.description}
                </p>
                <p className="text-xs text-gray-500">
                  {statusInfo.note}
                </p>
              </div>
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
          variant={activeTab === 'agenda' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('agenda')}
          size="sm"
        >
          <UserCheck className="h-4 w-4 mr-2" />
          Agenda do Especialista
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
          <Calendar className="h-4 w-4 mr-2" />
          Serviços
        </Button>
        <Button 
          variant={activeTab === 'barbers' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('barbers')}
          size="sm"
        >
          <Users className="h-4 w-4 mr-2" />
          Especialistas
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
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <AppointmentsManager barbershopId={barbershop.id} />
        </div>
      )}

      {activeTab === 'agenda' && (
        <BarberAgenda barbershopId={barbershop.id} />
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
        <BarbershopSettings barbershop={barbershop} onUpdate={onUpdate} />
      )}
    </div>
  );
};
