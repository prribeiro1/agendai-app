
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Scissors, LogOut, Settings, Calendar, Users, CreditCard } from 'lucide-react';
import { BarbershopSetup } from './BarbershopSetup';
import { BarbershopDashboard } from './BarbershopDashboard';

interface Barbershop {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  subscriptions: Array<{
    status: string;
    current_period_end: string;
  }>;
}

const DashboardLayout = () => {
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBarbershop();
  }, []);

  const loadBarbershop = async () => {
    const { data, error } = await supabase
      .from('barbershops')
      .select(`
        id,
        name,
        slug,
        is_active,
        subscriptions(status, current_period_end)
      `)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao carregar barbearia:', error);
    } else if (data) {
      setBarbershop(data);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao sair');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Scissors className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!barbershop) {
    return <BarbershopSetup onSetup={loadBarbershop} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Scissors className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold">{barbershop.name}</h1>
                <p className="text-sm text-gray-500">
                  {barbershop.is_active ? 'Ativo' : 'Inativo - Assinatura necessária'}
                </p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BarbershopDashboard barbershop={barbershop} onUpdate={loadBarbershop} />
      </main>
    </div>
  );
};

export default DashboardLayout;
