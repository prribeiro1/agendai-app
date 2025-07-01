
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Barbershop {
  id: string;
  name: string;
  slug: string;
  phone: string;
  address: string;
  description: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Barber {
  id: string;
  name: string;
  photo_url?: string;
}

export const useBarbershopData = (slug: string | undefined) => {
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadBarbershopData();
    }
  }, [slug]);

  const loadBarbershopData = async () => {
    try {
      console.log('Carregando dados da barbearia com slug:', slug);
      
      // Carregar dados da barbearia
      const { data: barbershopData, error: barbershopError } = await supabase
        .from('barbershops')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (barbershopError || !barbershopData) {
        console.error('Erro ao carregar barbearia:', barbershopError);
        toast.error('Barbearia não encontrada ou inativa');
        setLoading(false);
        return;
      }

      console.log('Barbearia carregada:', barbershopData);
      setBarbershop(barbershopData);

      // Carregar serviços
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barbershopData.id)
        .eq('is_active', true);

      if (servicesError) {
        console.error('Erro ao carregar serviços:', servicesError);
      } else {
        console.log('Serviços carregados:', servicesData);
        setServices(servicesData || []);
      }

      // Carregar barbeiros
      const { data: barbersData, error: barbersError } = await supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', barbershopData.id)
        .eq('is_active', true);

      if (barbersError) {
        console.error('Erro ao carregar barbeiros:', barbersError);
      } else {
        console.log('Barbeiros carregados:', barbersData);
        setBarbers(barbersData || []);
      }

    } catch (error) {
      console.error('Erro inesperado ao carregar dados:', error);
      toast.error('Erro inesperado ao carregar dados da barbearia');
    } finally {
      setLoading(false);
    }
  };

  return {
    barbershop,
    services,
    barbers,
    loading
  };
};
