
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';

const AuthLayout = () => {
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log('Tentando fazer login com telefone:', phone);
      
      // Criar email temporário baseado no telefone
      const cleanPhone = phone.replace(/\D/g, '');
      const tempEmail = `${cleanPhone}@temp.agendai.com`;
      
      console.log('Tentando login com email:', tempEmail);

      // Fazer login com email e senha
      const { data, error } = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password,
      });

      if (error) {
        console.error('Erro no login:', error);
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Telefone ou senha incorretos');
        } else {
          toast.error('Erro ao fazer login: ' + error.message);
        }
      } else {
        console.log('Login realizado com sucesso:', data);
        toast.success('Login realizado com sucesso!');
      }
    } catch (error) {
      console.error('Erro inesperado ao fazer login:', error);
      toast.error('Erro inesperado ao fazer login');
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log('Tentando criar conta com:', { name, phone });
      
      // Criar um email temporário baseado no telefone
      const cleanPhone = phone.replace(/\D/g, '');
      const tempEmail = `${cleanPhone}@temp.agendai.com`;

      console.log('Criando usuário com email temporário:', tempEmail);

      const { data: authData, error } = await supabase.auth.signUp({
        email: tempEmail,
        password,
        options: {
          data: {
            name: name,
            phone: phone,
          }
        }
      });

      console.log('Resultado da criação de usuário:', { authData, error });

      if (error) {
        console.error('Erro ao criar conta:', error);
        if (error.message.includes('User already registered')) {
          toast.error('Este telefone já está cadastrado. Tente fazer login.');
        } else {
          toast.error('Erro ao criar conta: ' + error.message);
        }
      } else if (authData.user) {
        console.log('Usuário criado com sucesso:', authData.user.id);
        toast.success('Conta criada com sucesso!');
      }
    } catch (error) {
      console.error('Erro inesperado ao criar conta:', error);
      toast.error('Erro inesperado ao criar conta');
    }
    
    setLoading(false);
  };

  const formatPhone = (value: string) => {
    // Remove tudo que não for número
    const phoneNumber = value.replace(/\D/g, '');
    
    // Aplica a máscara (11) 99999-9999
    if (phoneNumber.length <= 2) {
      return phoneNumber;
    } else if (phoneNumber.length <= 7) {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
    } else if (phoneNumber.length <= 11) {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7)}`;
    } else {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Calendar className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl">AgendAI</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Criar Conta</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Conta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthLayout;
