
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Scissors } from 'lucide-react';

interface BarbershopSetupProps {
  onSetup: () => void;
}

export const BarbershopSetup: React.FC<BarbershopSetupProps> = ({ onSetup }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: ''
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast.error('Nome da barbearia é obrigatório');
      return;
    }

    setLoading(true);

    try {
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error('Erro de autenticação. Faça login novamente.');
        return;
      }

      const slug = generateSlug(form.name);

      // Verificar se o slug já existe
      const { data: existingBarbershop } = await supabase
        .from('barbershops')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existingBarbershop) {
        toast.error('Já existe uma barbearia com este nome. Escolha outro nome.');
        return;
      }

      // Criar a barbearia com o owner_id definido
      const { data, error } = await supabase
        .from('barbershops')
        .insert([
          {
            name: form.name.trim(),
            slug: slug,
            phone: form.phone.trim() || null,
            address: form.address.trim() || null,
            owner_id: user.id, // Importante: definir o owner_id
            is_active: true
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar barbearia:', error);
        toast.error('Erro ao criar barbearia: ' + error.message);
        return;
      }

      console.log('Barbearia criada com sucesso:', data);
      toast.success('Barbearia criada com sucesso!');
      onSetup();
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao criar barbearia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Scissors className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle>Configure sua Barbearia</CardTitle>
          <p className="text-gray-600">
            Vamos configurar os dados básicos da sua barbearia
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Barbearia *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Barbearia do João"
                required
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Ex: (11) 99999-9999"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Ex: Rua das Flores, 123"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Barbearia'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
