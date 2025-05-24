
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ExternalLink, Users, Calendar, Settings } from 'lucide-react';
import { SubscriptionManager } from './SubscriptionManager';

interface BarbershopDashboardProps {
  barbershop: any;
  onUpdate: () => void;
}

export const BarbershopDashboard: React.FC<BarbershopDashboardProps> = ({ barbershop, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const subscription = barbershop.subscriptions?.[0];
  const isSubscriptionActive = subscription?.status === 'active';

  return (
    <div className="space-y-6">
      {/* Status da Assinatura - Agora opcional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Status da Assinatura (Opcional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Badge variant={isSubscriptionActive ? 'default' : 'secondary'}>
                {isSubscriptionActive ? 'Ativo' : 'Modo Teste - Grátis'}
              </Badge>
              {subscription?.current_period_end && (
                <p className="text-sm text-gray-600 mt-2">
                  Próxima cobrança: {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                </p>
              )}
              {!isSubscriptionActive && (
                <p className="text-sm text-gray-600 mt-2">
                  Você está no modo teste. Todas as funcionalidades estão disponíveis.
                </p>
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Compartilhe este link com seus clientes para que possam agendar online:
              </p>
              <p className="font-mono text-sm bg-gray-100 p-2 rounded mt-2">
                {window.location.origin}/agendar/{barbershop.slug}
              </p>
            </div>
            <Button 
              onClick={() => window.open(`/agendar/${barbershop.slug}`, '_blank')}
              variant="outline"
            >
              Abrir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navegação */}
      <div className="flex gap-2 border-b">
        <Button 
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('overview')}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Visão Geral
        </Button>
        <Button 
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Configurações
        </Button>
      </div>

      {/* Conteúdo das abas */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Agendamentos Hoje</p>
                  <p className="text-2xl font-bold text-blue-600">0</p>
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
                  <p className="text-2xl font-bold text-green-600">0</p>
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
                  <p className="text-2xl font-bold text-purple-600">R$ 0</p>
                </div>
                <CreditCard className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mensagem informativa sobre o modo teste */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              🎉 Modo Teste Ativo
            </h3>
            <p className="text-blue-700 mb-4">
              Todas as funcionalidades estão disponíveis gratuitamente para teste. 
              Quando estiver satisfeito, você pode ativar a assinatura.
            </p>
            <SubscriptionManager barbershop={barbershop} onUpdate={onUpdate} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
