
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ExternalLink, AlertCircle, CheckCircle, RefreshCw, Info } from 'lucide-react';
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
        
        // Tratar diferentes tipos de erro
        if (error.message?.includes('platform profile') || error.message?.includes('CONFIGURAÇÃO NECESSÁRIA')) {
          toast.error('Configuração do Stripe necessária', {
            description: 'Você precisa completar o perfil da plataforma no Stripe. Verifique as instruções abaixo.',
            duration: 8000
          });
          return;
        }
        
        if (error.message?.includes('já configurada')) {
          toast.error('Conta já configurada', {
            description: 'Esta barbearia já possui uma conta de pagamentos.',
            duration: 5000
          });
          checkConnectStatus(); // Recarregar status
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
      let errorDescription = '';
      
      if (error.message?.includes('platform profile')) {
        errorMessage = 'Configuração do Stripe necessária';
        errorDescription = 'Complete o perfil da plataforma no dashboard do Stripe.';
      } else if (error.message?.includes('losses') || error.message?.includes('liability')) {
        errorMessage = 'Configuração de responsabilidade necessária';
        errorDescription = 'Configure a responsabilidade de perdas no Stripe Connect.';
      } else {
        errorDescription = error.message || 'Tente novamente em alguns instantes.';
      }
      
      toast.error(errorMessage, {
        description: errorDescription,
        duration: 8000
      });
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
          {connectStatus.connected ? (
            connectStatus.charges_enabled && connectStatus.payouts_enabled ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
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
          <Badge variant={
            connectStatus.connected && connectStatus.charges_enabled && connectStatus.payouts_enabled 
              ? "default" 
              : connectStatus.connected 
              ? "secondary" 
              : "destructive"
          }>
            {connectStatus.connected && connectStatus.charges_enabled && connectStatus.payouts_enabled 
              ? "Ativo" 
              : connectStatus.connected 
              ? "Pendente" 
              : "Não configurado"
            }
          </Badge>
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

        {/* Instruções de configuração */}
        {!connectStatus.connected && (
          <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="text-blue-800 font-medium mb-1">Por que configurar?</p>
              <ul className="text-blue-700 space-y-1 text-xs">
                <li>• Receba pagamentos diretamente na sua conta</li>
                <li>• Clientes podem pagar online com cartão ou PIX</li>
                <li>• Transferências automáticas para sua conta bancária</li>
                <li>• Controle total sobre seus recebimentos</li>
              </ul>
            </div>

            <div className="bg-amber-50 p-3 rounded-lg text-sm border border-amber-200">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-medium mb-1">Configuração necessária no Stripe</p>
                  <p className="text-amber-700 text-xs mb-2">
                    Antes de configurar, você precisa completar seu perfil da plataforma no Stripe:
                  </p>
                  <ol className="text-amber-700 text-xs space-y-1 ml-3">
                    <li>1. Acesse o dashboard do Stripe</li>
                    <li>2. Vá em Settings → Connect → Platform profile</li>
                    <li>3. Complete todas as seções obrigatórias</li>
                    <li>4. Configure a responsabilidade de perdas</li>
                    <li>5. Volte aqui e clique em "Configurar Conta"</li>
                  </ol>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => window.open('https://dashboard.stripe.com/settings/connect/platform-profile', '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Abrir Stripe Platform Profile
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
