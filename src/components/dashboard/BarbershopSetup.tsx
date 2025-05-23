
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    slug: '',
    phone: '',
    address: '',
    description: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from name
    if (field === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setForm(prev => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      toast.error('Usuário não autenticado');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('barbershops')
      .insert([{
        ...form,
        owner_id: user.user.id
      }]);

    if (error) {
      toast.error('Erro ao criar barbearia: ' + error.message);
    } else {
      toast.success('Barbearia criada com sucesso!');
      onSetup();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scissors className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl">Configure sua Barbearia</CardTitle>
          </div>
          <p className="text-gray-600">
            Configure os dados da sua barbearia para começar a receber agendamentos
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Nome da Barbearia *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Barbearia do João"
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">URL Personalizada *</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="barbearia-do-joao"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Seus clientes acessarão: agendai.com/{form.slug}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Rua da Barbearia, 123"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descreva sua barbearia..."
              />
            </div>

            <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Barbearia'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
