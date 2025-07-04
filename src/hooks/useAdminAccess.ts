
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminAccess = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Buscar o perfil do usuário para pegar o telefone
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Verificar se o usuário é admin através do telefone
      const adminPhones = [
        '(11) 99999-9999', // Exemplo - substitua pelo seu telefone
        // Adicione outros telefones de admin aqui
      ];
      
      setIsAdmin(adminPhones.includes(profile.phone));
      setLoading(false);
    } catch (error) {
      console.error('Erro ao verificar acesso admin:', error);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  return { isAdmin, loading };
};
