
import React from 'react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AlertTriangle } from 'lucide-react';

const AdminPage = () => {
  const { isAdmin, loading } = useAdminAccess();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p>Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar o dashboard administrativo.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Voltar ao Sistema
          </button>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
};

export default AdminPage;
