
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionManagerProps {
  barbershop: any;
  onUpdate: () => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ barbershop, onUpdate }) => {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Por enquanto, apenas mostra uma mensagem
      toast.info('Integração com Stripe será implementada. Por favor, forneça sua chave secreta do Stripe.');
    } catch (error) {
      toast.error('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const subscription = barbershop.subscriptions?.[0];
  const isActive = subscription?.status === 'active';

  if (isActive) {
    return (
      <Button variant="outline" disabled>
        <CreditCard className="h-4 w-4 mr-2" />
        Assinatura Ativa
      </Button>
    );
  }

  return (
    <Button onClick={handleSubscribe} disabled={loading}>
      <CreditCard className="h-4 w-4 mr-2" />
      {loading ? 'Processando...' : 'Assinar por R$ 19,90/mês'}
    </Button>
  );
};
