
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionManagerProps {
  barbershop: any;
  onUpdate: () => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ barbershop, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const subscription = barbershop.subscriptions?.[0];
  const isActive = subscription?.status === 'active';

  // Verificar o status da assinatura
  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      setCheckingStatus(true);
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      if (data.subscribed !== isActive) {
        // Se o status mudou, atualizar a página
        onUpdate();
      }
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Iniciar o processo de assinatura
  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      
      if (data.url) {
        // Redirecionar para a página de checkout do Stripe
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  // Abrir portal do cliente para gerenciar assinatura
  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data.url) {
        // Redirecionar para o portal do cliente
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Erro ao abrir portal de assinatura:', error);
      toast.error('Erro ao abrir configurações de assinatura');
    } finally {
      setLoading(false);
    }
  };

  if (isActive) {
    return (
      <div className="flex space-x-2">
        <Button variant="outline" disabled={checkingStatus} onClick={checkSubscriptionStatus} size="sm">
          <CreditCard className="h-4 w-4 mr-2" />
          {checkingStatus ? 'Verificando...' : 'Assinatura Ativa'}
        </Button>
        <Button onClick={handleManageSubscription} disabled={loading} size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          {loading ? 'Carregando...' : 'Gerenciar Assinatura'}
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleSubscribe} disabled={loading}>
      <CreditCard className="h-4 w-4 mr-2" />
      {loading ? 'Processando...' : 'Assinar por R$ 19,90/mês'}
    </Button>
  );
};
