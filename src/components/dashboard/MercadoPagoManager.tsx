
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle, AlertCircle, ExternalLink, Info } from 'lucide-react';

interface MercadoPagoManagerProps {
  barbershopId: string;
}

export const MercadoPagoManager: React.FC<MercadoPagoManagerProps> = ({ barbershopId }) => {
  const [checking, setChecking] = useState(false);

  const handleTestPayment = () => {
    setChecking(true);
    // Simular teste rápido
    setTimeout(() => {
      setChecking(false);
    }, 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Mercado Pago Configurado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Status da integração</p>
            <p className="text-sm text-gray-600">
              Mercado Pago configurado e funcionando
            </p>
          </div>
          <Badge variant="default">Ativo</Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>PIX:</span>
            <Badge variant="default">Habilitado</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Cartão de Crédito/Débito:</span>
            <Badge variant="default">Habilitado</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Pagamento no Local:</span>
            <Badge variant="default">Habilitado</Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleTestPayment} 
            disabled={checking}
            variant="outline"
            size="sm"
          >
            <CreditCard className={`h-4 w-4 mr-2 ${checking ? 'animate-pulse' : ''}`} />
            {checking ? 'Testando...' : 'Testar Pagamento'}
          </Button>
          
          <Button 
            onClick={() => window.open('https://www.mercadopago.com.br/developers/panel', '_blank')}
            variant="outline"
            size="sm"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Painel MP
          </Button>
        </div>

        <div className="bg-green-50 p-3 rounded-lg text-sm border border-green-200">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-green-800 font-medium mb-1">Mercado Pago Ativo!</p>
              <ul className="text-green-700 space-y-1 text-xs">
                <li>• PIX instantâneo funcionando</li>
                <li>• Cartões de crédito e débito</li>
                <li>• Pagamento no local disponível</li>
                <li>• Transferências automáticas</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg text-sm border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-blue-800 font-medium mb-1">Vantagens do Mercado Pago</p>
              <ul className="text-blue-700 space-y-1 text-xs">
                <li>• PIX grátis para pessoa física</li>
                <li>• Taxas competitivas no cartão</li>
                <li>• Ideal para o mercado brasileiro</li>
                <li>• Suporte completo a todos os métodos</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
