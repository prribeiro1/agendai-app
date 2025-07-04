
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

      // Verificar se o usuário é admin
      const adminEmails = [
        'admin@agendai.com', 
        'suporte@agendai.com',
        'prribeiro.contato@gmail.com',
        // Adicione outros emails de admin aqui
      ];
      
      setIsAdmin(adminEmails.includes(user.email || ''));
      setLoading(false);
    } catch (error) {
      console.error('Erro ao verificar acesso admin:', error);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  return { isAdmin, loading };
};
