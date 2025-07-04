
-- Adicionar colunas para controle de teste gratuito e melhor gestão de assinaturas
ALTER TABLE public.subscriptions 
ADD COLUMN trial_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN trial_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_trial BOOLEAN DEFAULT false,
ADD COLUMN payment_failed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN blocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN blocked_reason TEXT;

-- Atualizar barbearias existentes para terem teste gratuito de 7 dias
UPDATE public.barbershops 
SET is_active = true 
WHERE is_active = false AND created_at > NOW() - INTERVAL '7 days';

-- Adicionar trigger para criar período de teste automaticamente quando uma barbearia é criada
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar assinatura de teste de 7 dias para nova barbearia
  INSERT INTO public.subscriptions (
    barbershop_id,
    status,
    is_trial,
    trial_start,
    trial_end,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'trial',
    true,
    NOW(),
    NOW() + INTERVAL '7 days',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger que executa quando uma nova barbearia é inserida
CREATE TRIGGER create_trial_subscription_trigger
  AFTER INSERT ON public.barbershops
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription();

-- Função para verificar se uma barbearia deve ser bloqueada
CREATE OR REPLACE FUNCTION public.check_subscription_status()
RETURNS void AS $$
BEGIN
  -- Bloquear barbearias com teste expirado e sem assinatura ativa
  UPDATE public.barbershops 
  SET is_active = false 
  WHERE id IN (
    SELECT b.id 
    FROM public.barbershops b
    LEFT JOIN public.subscriptions s ON b.id = s.barbershop_id
    WHERE (
      (s.is_trial = true AND s.trial_end < NOW() AND s.status != 'active')
      OR 
      (s.status = 'past_due' AND s.payment_failed_at < NOW() - INTERVAL '3 days')
      OR
      (s.status = 'canceled' OR s.status = 'unpaid')
    )
    AND b.is_active = true
  );
  
  -- Ativar barbearias com assinatura ativa
  UPDATE public.barbershops 
  SET is_active = true 
  WHERE id IN (
    SELECT b.id 
    FROM public.barbershops b
    JOIN public.subscriptions s ON b.id = s.barbershop_id
    WHERE s.status = 'active'
    AND b.is_active = false
  );
END;
$$ LANGUAGE plpgsql;
