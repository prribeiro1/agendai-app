
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Smartphone, DollarSign } from 'lucide-react';

interface PaymentMethodSelectorProps {
  servicePrice: number;
  onPaymentMethodSelect: (method: 'card' | 'pix' | 'cash') => void;
  loading: boolean;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  servicePrice,
  onPaymentMethodSelect,
  loading
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Forma de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 mb-4">
            Total: R$ {servicePrice.toFixed(2)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-20 flex flex-col gap-2 hover:bg-green-50 hover:border-green-300"
            onClick={() => onPaymentMethodSelect('pix')}
            disabled={loading}
          >
            <Smartphone className="h-6 w-6 text-green-600" />
            <span className="font-medium">PIX</span>
            <span className="text-xs text-gray-500">Pagamento instantâneo</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-300"
            onClick={() => onPaymentMethodSelect('card')}
            disabled={loading}
          >
            <CreditCard className="h-6 w-6 text-blue-600" />
            <span className="font-medium">Cartão</span>
            <span className="text-xs text-gray-500">Crédito ou Débito</span>
          </Button>
        </div>

        <div className="border-t pt-4">
          <Button
            variant="ghost"
            className="w-full h-16 flex flex-col gap-1 hover:bg-gray-50"
            onClick={() => onPaymentMethodSelect('cash')}
            disabled={loading}
          >
            <DollarSign className="h-5 w-5 text-gray-600" />
            <span className="font-medium">Pagar no Local</span>
            <span className="text-xs text-gray-500">Dinheiro ou cartão na barbearia</span>
          </Button>
        </div>

        <div className="text-center text-xs text-gray-500 mt-4">
          <p>💳 Pagamentos online processados pelo Mercado Pago</p>
          <p>🔒 Seus dados estão seguros e protegidos</p>
        </div>
      </CardContent>
    </Card>
  );
};
