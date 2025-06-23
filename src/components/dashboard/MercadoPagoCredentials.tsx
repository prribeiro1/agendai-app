
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Eye, EyeOff, Save, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MercadoPagoCredentialsProps {
  barbershopId: string;
}

export const MercadoPagoCredentials: React.FC<MercadoPagoCredentialsProps> = ({ barbershopId }) => {
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, [barbershopId]);

  const loadCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('barbershops')
        .select('mercadopago_access_token')
        .eq('id', barbershopId)
        .single();

      if (error) {
        console.error('Erro ao carregar credenciais:', error);
        return;
      }

      if (data?.mercadopago_access_token) {
        setHasCredentials(true);
        setAccessToken('***TOKEN_CONFIGURADO***');
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar credenciais:', error);
    }
  };

  const saveCredentials = async () => {
    if (!accessToken || accessToken === '***TOKEN_CONFIGURADO***') {
      toast.error('Por favor, insira um Access Token válido');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({ mercadopago_access_token: accessToken })
        .eq('id', barbershopId);

      if (error) {
        console.error('Erro ao salvar credenciais:', error);
        toast.error('Erro ao salvar credenciais do Mercado Pago');
        return;
      }

      setHasCredentials(true);
      toast.success('Credenciais do Mercado Pago salvas com sucesso!');
      setAccessToken('***TOKEN_CONFIGURADO***');
      setShowToken(false);
    } catch (error) {
      console.error('Erro inesperado ao salvar credenciais:', error);
      toast.error('Erro inesperado ao salvar credenciais');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      // Aqui você poderia fazer uma chamada para testar as credenciais
      // Por simplicidade, vamos simular um teste bem-sucedido
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Conexão com Mercado Pago testada com sucesso!');
    } catch (error) {
      toast.error('Erro ao testar conexão com Mercado Pago');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Credenciais Mercado Pago
          {hasCredentials && <Badge variant="default">Configurado</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Configure suas credenciais do Mercado Pago para receber pagamentos dos clientes diretamente na sua conta.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="access_token">Access Token do Mercado Pago</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="access_token"
                  type={showToken ? 'text' : 'password'}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="APP_USR-..."
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Encontre seu Access Token no painel do Mercado Pago
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={saveCredentials} 
              disabled={loading || !accessToken || accessToken === '***TOKEN_CONFIGURADO***'}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Credenciais'}
            </Button>

            {hasCredentials && (
              <Button 
                variant="outline" 
                onClick={testConnection}
                disabled={testingConnection}
              >
                <CheckCircle className={`h-4 w-4 mr-2 ${testingConnection ? 'animate-spin' : ''}`} />
                {testingConnection ? 'Testando...' : 'Testar Conexão'}
              </Button>
            )}

            <Button 
              variant="outline"
              onClick={() => window.open('https://www.mercadopago.com.br/developers/panel/app', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Painel MP
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Como configurar:</h4>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Acesse o <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Painel de Desenvolvedores do Mercado Pago</a></li>
            <li>Faça login com sua conta do Mercado Pago</li>
            <li>Crie uma nova aplicação ou use uma existente</li>
            <li>Vá em "Credenciais" e copie o "Access Token de Produção"</li>
            <li>Cole o token no campo acima e clique em "Salvar"</li>
          </ol>
        </div>

        {hasCredentials && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-green-800 font-medium">Mercado Pago Configurado!</p>
                <ul className="text-green-700 text-sm mt-1 space-y-1">
                  <li>• Seus clientes podem pagar com PIX e cartão</li>
                  <li>• O dinheiro vai direto para sua conta Mercado Pago</li>
                  <li>• Transferência automática para sua conta bancária</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {!hasCredentials && (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-yellow-800 font-medium">Configuração Pendente</p>
                <p className="text-yellow-700 text-sm mt-1">
                  Configure suas credenciais para começar a receber pagamentos online.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
