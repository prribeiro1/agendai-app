
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ExternalLink, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface StripeConnectManagerProps {
  barbershopId: string;
}

export const StripeConnectManager: React.FC<StripeConnectManagerProps> = ({ barbershopId }) => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [connectStatus, setConnectStatus] = useState<{
    connected: boolean;
    account_status: string | null;
    charges_enabled: boolean;
    payouts_enabled: boolean;
  }>({
    connected: false,
    account_status: null,
    charges_enabled: false,
    payouts_enabled: false
  });

  useEffect(() => {
    checkConnectStatus();
  }, []);

  const checkConnectStatus = async () => {
    try {
      setChecking(true);
      console.log('Verificando status da conta Stripe Connect...');
      
      const { data, error } = await supabase.functions.invoke('check-connect-account');
      
      if (error) {
        console.error('Erro ao verificar conta Connect:', error);
        throw error;
      }
      
      console.log('Status da conta Connect:', data);
      setConnectStatus(data);
    } catch (error) {
      console.error('Erro ao verificar status do Stripe Connect:', error);
      toast.error('Erro ao verificar status da conta de pagamentos');
    } finally {
      setChecking(false);
    }
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      console.log('Criando conta Stripe Connect...');
      
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      
      if (error) {
        console.error('Erro ao criar conta Connect:', error);
        
        // Tratar erro específico do Stripe Connect não habilitado
        if (error.message?.includes('signed up for Connect')) {
          toast.error('Para usar esta funcionalidade, você precisa habilitar o Stripe Connect na sua conta Stripe. Acesse o dashboard do Stripe e ative o Connect.', {
            duration: 8000
          });
          return;
        }
        
        throw error;
      }
      
      console.log('Conta Connect criada:', data);
      
      if (data?.onboarding_url) {
        toast.success('Redirecionando para configuração da conta...', {
          duration: 2000
        });
        
        setTimeout(() => {
          window.open(data.onboarding_url, '_blank');
        }, 1000);
      } else {
        throw new Error('URL de configuração não retornada');
      }
    } catch (error) {
      console.error('Erro ao criar conta Stripe Connect:', error);
      
      let errorMessage = 'Erro ao criar conta de pagamentos';
      if (error.message?.includes('já existe')) {
        errorMessage = 'Você já possui uma conta de pagamentos configurada';
        checkConnectStatus(); // Recarregar status
      } else if (error.message?.includes('Connect')) {
        errorMessage = 'Stripe Connect não está habilitado. Ative no dashboard do Stripe primeiro.';
      } else {
        errorMessage = error.message || 'Erro inesperado. Tente novamente.';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!connectStatus.connected) {
      return <Badge variant="destructive">Não configurado</Badge>;
    }
    
    if (connectStatus.charges_enabled && connectStatus.payouts_enabled) {
      return <Badge variant="default">Ativo</Badge>;
    }
    
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const getStatusIcon = () => {
    if (!connectStatus.connected) {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
    
    if (connectStatus.charges_enabled && connectStatus.payouts_enabled) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    
    return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  };

  if (checking) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Verificando configuração de pagamentos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Configuração de Pagamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Status da conta</p>
            <p className="text-sm text-gray-600">
              {connectStatus.connected 
                ? 'Conta configurada no Stripe' 
                : 'Conta não configurada'
              }
            </p>
          </div>
          {getStatusBadge()}
        </div>

        {connectStatus.connected && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Receber pagamentos:</span>
              <Badge variant={connectStatus.charges_enabled ? "default" : "secondary"}>
                {connectStatus.charges_enabled ? "Habilitado" : "Pendente"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Transferências bancárias:</span>
              <Badge variant={connectStatus.payouts_enabled ? "default" : "secondary"}>
                {connectStatus.payouts_enabled ? "Habilitado" : "Pendente"}
              </Badge>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {!connectStatus.connected ? (
            <Button 
              onClick={handleCreateAccount} 
              disabled={loading}
              className="w-full"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {loading ? 'Configurando...' : 'Configurar Conta de Pagamentos'}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                onClick={checkConnectStatus} 
                disabled={checking}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                Atualizar Status
              </Button>
            </div>
          )}
        </div>

        {!connectStatus.connected && (
          <div className="bg-blue-50 p-3 rounded-lg text-sm">
            <p className="text-blue-800 font-medium mb-1">Por que configurar?</p>
            <ul className="text-blue-700 space-y-1 text-xs">
              <li>• Receba pagamentos diretamente na sua conta</li>
              <li>• Clientes podem pagar online com cartão ou PIX</li>
              <li>• Transferências automáticas para sua conta bancária</li>
              <li>• Controle total sobre seus recebimentos</li>
            </ul>
          </div>
        )}

        {!connectStatus.connected && (
          <div className="bg-yellow-50 p-3 rounded-lg text-sm border border-yellow-200">
            <p className="text-yellow-800 font-medium mb-1">⚠️ Pré-requisito</p>
            <p className="text-yellow-700 text-xs">
              Certifique-se de que o Stripe Connect está habilitado na sua conta Stripe antes de configurar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
