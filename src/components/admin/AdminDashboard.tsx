
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Settings, 
  Users, 
  Building2, 
  Calendar, 
  DollarSign,
  Eye,
  AlertTriangle
} from 'lucide-react';

interface Barbershop {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  owner_id: string;
  subscriptions?: Array<{
    status: string;
    is_trial: boolean;
    trial_end: string;
  }>;
  _count?: {
    appointments: number;
    services: number;
    barbers: number;
  };
}

export const AdminDashboard = () => {
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBarbershops: 0,
    activeBarbershops: 0,
    totalAppointments: 0,
    trialBarbershops: 0
  });

  useEffect(() => {
    loadBarbershops();
    loadStats();
  }, []);

  const loadBarbershops = async () => {
    try {
      const { data, error } = await supabase
        .from('barbershops')
        .select(`
          *,
          subscriptions(status, is_trial, trial_end)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar barbearias:', error);
        toast.error('Erro ao carregar barbearias');
        return;
      }

      setBarbershops(data || []);
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Contar barbearias
      const { data: barbershopsData, error: barbershopsError } = await supabase
        .from('barbershops')
        .select('id, is_active');

      if (barbershopsError) {
        console.error('Erro ao carregar estatísticas de barbearias:', barbershopsError);
        return;
      }

      // Contar agendamentos
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id');

      if (appointmentsError) {
        console.error('Erro ao carregar estatísticas de agendamentos:', appointmentsError);
        return;
      }

      // Contar trials
      const { data: trialsData, error: trialsError } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('is_trial', true);

      if (trialsError) {
        console.error('Erro ao carregar estatísticas de trials:', trialsError);
        return;
      }

      setStats({
        totalBarbershops: barbershopsData?.length || 0,
        activeBarbershops: barbershopsData?.filter(b => b.is_active).length || 0,
        totalAppointments: appointmentsData?.length || 0,
        trialBarbershops: trialsData?.length || 0
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const toggleBarbershopStatus = async (barbershopId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({ is_active: !currentStatus })
        .eq('id', barbershopId);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        toast.error('Erro ao atualizar status da barbearia');
        return;
      }

      toast.success('Status da barbearia atualizado com sucesso');
      loadBarbershops();
      loadStats();
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao atualizar status');
    }
  };

  const getSubscriptionStatus = (barbershop: Barbershop) => {
    const subscription = barbershop.subscriptions?.[0];
    if (!subscription) return { label: 'Sem assinatura', color: 'bg-gray-100' };
    
    if (subscription.is_trial) {
      const trialEnd = new Date(subscription.trial_end);
      const now = new Date();
      const isExpired = trialEnd < now;
      
      return {
        label: isExpired ? 'Trial Expirado' : 'Trial Ativo',
        color: isExpired ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
      };
    }
    
    return {
      label: subscription.status === 'active' ? 'Assinatura Ativa' : 'Assinatura Inativa',
      color: subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando dashboard admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-red-600" />
              <div>
                <h1 className="text-xl font-bold">Dashboard Administrativo</h1>
                <p className="text-sm text-gray-500">
                  Controle total do sistema AgendAI
                </p>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline" 
              size="sm"
            >
              Voltar ao Sistema
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Barbearias</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalBarbershops}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Barbearias Ativas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeBarbershops}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Agendamentos</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalAppointments}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Em Trial</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.trialBarbershops}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Barbearias */}
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Barbearias</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assinatura</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {barbershops.map((barbershop) => {
                  const subscriptionStatus = getSubscriptionStatus(barbershop);
                  
                  return (
                    <TableRow key={barbershop.id}>
                      <TableCell className="font-medium">{barbershop.name}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {barbershop.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={barbershop.is_active}
                            onCheckedChange={() => toggleBarbershopStatus(barbershop.id, barbershop.is_active)}
                          />
                          <Badge variant={barbershop.is_active ? 'default' : 'secondary'}>
                            {barbershop.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={subscriptionStatus.color}>
                          {subscriptionStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(barbershop.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/agendar/${barbershop.slug}`, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContent>
        </Card>
      </main>
    </div>
  );
};
