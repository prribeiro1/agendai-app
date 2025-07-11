
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, ExternalLink, RefreshCw, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
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

  // Verificar o status da assinatura
  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      setCheckingStatus(true);
      console.log('Verificando status da assinatura...');
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Erro na função check-subscription:', error);
        throw error;
      }
      
      console.log('Resultado da verificação:', data);
      
      if (data.subscribed !== isActive) {
        console.log('Status mudou, atualizando página...');
        onUpdate();
      }
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
      toast.error('Erro ao verificar status da assinatura');
    } finally {
      setCheckingStatus(false);
    }
  };

  // Iniciar o processo de assinatura
  const handleSubscribe = async () => {
    setLoading(true);
    try {
      console.log('Iniciando processo de assinatura...');
      
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) {
        console.error('Erro na função create-checkout:', error);
        throw error;
      }
      
      console.log('Checkout criado com sucesso:', data);
      
      if (data?.url) {
        toast.success('Redirecionando para o pagamento...', {
          duration: 2000,
          icon: <CheckCircle2 className="h-4 w-4" />
        });
        
        setTimeout(() => {
          console.log('Redirecionando para:', data.url);
          window.location.href = data.url;
        }, 1000);
      } else {
        throw new Error('URL de pagamento não retornada');
      }
    } catch (error) {
      console.error('Erro ao processar assinatura:', error);
      
      let errorMessage = 'Erro ao processar assinatura';
      
      if (error.message?.includes('não autenticado') || error.message?.includes('Sessão expirada')) {
        errorMessage = 'Sua sessão expirou. Faça login novamente.';
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (error.message?.includes('barbearia')) {
        errorMessage = 'Erro ao verificar sua barbearia. Atualize a página e tente novamente.';
      } else if (error.message?.includes('já possui uma assinatura ativa')) {
        errorMessage = 'Você já possui uma assinatura ativa.';
        onUpdate(); // Atualizar dados
      } else {
        errorMessage = error.message || 'Erro inesperado. Tente novamente.';
      }
      
      toast.error(errorMessage, {
        duration: 8000,
        action: {
          label: "Tentar novamente",
          onClick: () => handleSubscribe()
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Abrir portal de gerenciamento de assinatura
  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      console.log('Abrindo portal de assinatura...');
      
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        console.error('Erro na função customer-portal:', error);
        throw error;
      }
      
      console.log('Portal de assinatura criado:', data);
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL do portal não retornada');
      }
    } catch (error) {
      console.error('Erro ao abrir portal de assinatura:', error);
      toast.error('Erro ao abrir configurações de assinatura');
    } finally {
      setLoading(false);
    }
  };

  // Se tem assinatura ativa
  if (isActive) {
    return (
      <div className="flex flex-col sm:flex-row gap-2">
        <Button 
          variant="outline" 
          disabled={checkingStatus} 
          onClick={checkSubscriptionStatus} 
          size="sm"
          className="min-w-fit"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${checkingStatus ? 'animate-spin' : ''}`} />
          {checkingStatus ? 'Verificando...' : 'Assinatura Ativa'}
        </Button>
        <Button onClick={handleManageSubscription} disabled={loading} size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          {loading ? 'Carregando...' : 'Gerenciar Assinatura'}
        </Button>
      </div>
    );
  }

  // Se está em período de teste
  if (isTrial && !isTrialExpired) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-blue-600">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">
            Teste gratuito - {trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''} restante{trialDaysLeft !== 1 ? 's' : ''}
          </span>
        </div>
        <Button 
          onClick={handleSubscribe} 
          disabled={loading} 
          className="w-full sm:w-auto"
          size="lg"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          {loading ? 'Processando...' : 'Assinar Agora - R$ 49,90/mês'}
        </Button>
        <p className="text-xs text-gray-500">
          Pagamento seguro via cartão de crédito ou boleto • Cancele a qualquer momento
        </p>
      </div>
    );
  }

  // Se o teste expirou ou não tem assinatura
  return (
    <div className="flex flex-col gap-3">
      {isTrialExpired && (
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">
            Período de teste expirado
          </span>
        </div>
      )}
      <Button 
        onClick={handleSubscribe} 
        disabled={loading} 
        className="w-full sm:w-auto"
        size="lg"
      >
        <CreditCard className="h-4 w-4 mr-2" />
        {loading ? 'Processando...' : 'Assinar - R$ 49,90/mês'}
      </Button>
      <p className="text-xs text-gray-500">
        Pagamento seguro via cartão de crédito ou boleto • Cancele a qualquer momento
      </p>
    </div>
  );
};
