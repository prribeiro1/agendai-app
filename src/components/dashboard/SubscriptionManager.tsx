
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
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
        // Redirecionar para a página de checkout do Stripe
        console.log('Redirecionando para:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      
      // Mensagens de erro mais específicas baseadas no tipo de erro
      let errorMessage = 'Erro ao processar pagamento';
      
      if (error.message?.includes('STRIPE_SECRET_KEY') || error.message?.includes('configuração')) {
        errorMessage = 'Sistema de pagamento temporariamente indisponível. Tente novamente em alguns minutos.';
      } else if (error.message?.includes('não autenticado') || error.message?.includes('Sessão expirada')) {
        errorMessage = 'Sua sessão expirou. Faça login novamente.';
        // Opcional: redirecionar para login
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (error.message?.includes('barbearia')) {
        errorMessage = 'Erro ao verificar sua barbearia. Atualize a página e tente novamente.';
      } else if (error.message?.includes('Edge Function returned a non-2xx status code')) {
        errorMessage = 'Erro de comunicação com o servidor. Verifique sua conexão e tente novamente.';
      } else {
        errorMessage = error.message || 'Erro inesperado. Tente novamente.';
      }
      
      toast.error(errorMessage, {
        duration: 6000,
        action: {
          label: "Tentar novamente",
          onClick: () => handleSubscribe()
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Abrir portal do cliente para gerenciar assinatura
  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      console.log('Abrindo portal do cliente...');
      
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        console.error('Erro na função customer-portal:', error);
        throw error;
      }
      
      console.log('Portal criado com sucesso:', data);
      
      if (data?.url) {
        // Redirecionar para o portal do cliente
        console.log('Redirecionando para portal:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('URL do portal não retornada');
      }
    } catch (error) {
      console.error('Erro ao abrir portal de assinatura:', error);
      
      let errorMessage = 'Erro ao abrir configurações de assinatura';
      if (error.message?.includes('Nenhuma assinatura encontrada')) {
        errorMessage = 'Você precisa ter uma assinatura ativa para acessar o portal';
      } else if (error.message?.includes('não encontrado no sistema')) {
        errorMessage = 'Dados de pagamento não encontrados. Entre em contato com o suporte.';
      } else {
        errorMessage = error.message || 'Erro inesperado. Tente novamente.';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="flex flex-col gap-3">
      <Button 
        onClick={handleSubscribe} 
        disabled={loading} 
        className="w-full sm:w-auto"
        size="lg"
      >
        <CreditCard className="h-4 w-4 mr-2" />
        {loading ? 'Processando...' : 'Assinar por R$ 19,90/mês'}
      </Button>
      
      {/* Informações sobre a assinatura */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm">
        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-blue-800">
          <p className="font-medium mb-1">Sobre a assinatura:</p>
          <ul className="space-y-1 text-xs">
            <li>• Pagamento mensal de R$ 19,90</li>
            <li>• Cancele a qualquer momento</li>
            <li>• Suporte prioritário</li>
            <li>• Todas as funcionalidades incluídas</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
