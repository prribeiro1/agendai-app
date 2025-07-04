import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthLayout from "./components/auth/AuthLayout";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import BookingPage from "./pages/BookingPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import { toast } from "sonner";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);

      // Verificar status da assinatura após login
      if (session) {
        checkSubscription();
      }
    });

    // Escutar mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      // Verificar status da assinatura após login
      if (session) {
        checkSubscription();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Verificar status da assinatura
  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      
      // Verificar se há parâmetros de sucesso na URL (vindo do Stripe)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('success')) {
        toast.success('Assinatura realizada com sucesso!');
        // Limpar os parâmetros da URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (urlParams.get('canceled')) {
        toast.info('Processo de assinatura cancelado');
        // Limpar os parâmetros da URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (urlParams.get('setup')) {
        if (urlParams.get('setup') === 'complete') {
          toast.success('Configuração do Stripe Connect concluída!');
        }
        // Limpar os parâmetros da URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (urlParams.get('refresh')) {
        toast.info('Recarregue a página para atualizar o status');
        // Limpar os parâmetros da URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rotas públicas de agendamento */}
            <Route path="/agendar/:slug" element={<BookingPage />} />
            <Route path="/pagamento-sucesso" element={<PaymentSuccessPage />} />
            
            {/* Rota admin */}
            <Route path="/admin" element={<AdminPage />} />
            
            {/* Rotas do dashboard (requer autenticação) */}
            <Route path="/" element={session ? <DashboardLayout /> : <AuthLayout />} />
            
            {/* Rota 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
