
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Edit, Trash2, Users, Image } from 'lucide-react';
import { toast } from 'sonner';

interface Barber {
  id: string;
  name: string;
  is_active: boolean;
  photo_url?: string;
}

interface BarbersManagerProps {
  barbershopId: string;
}

export const BarbersManager: React.FC<BarbersManagerProps> = ({ barbershopId }) => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [form, setForm] = useState({
    name: '',
    photo_url: ''
  });

  useEffect(() => {
    loadBarbers();
  }, [barbershopId]);

  const loadBarbers = async () => {
    const { data, error } = await supabase
      .from('barbers')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('name');

    if (error) {
      console.error('Erro ao carregar barbeiros:', error);
      toast.error('Erro ao carregar barbeiros');
    } else {
      setBarbers(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    const barberData = {
      name: form.name,
      photo_url: form.photo_url || null,
      barbershop_id: barbershopId,
      is_active: true
    };

    let error;
    if (editingBarber) {
      const { error: updateError } = await supabase
        .from('barbers')
        .update(barberData)
        .eq('id', editingBarber.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('barbers')
        .insert([barberData]);
      error = insertError;
    }

    if (error) {
      console.error('Erro ao salvar barbeiro:', error);
      toast.error('Erro ao salvar barbeiro');
    } else {
      toast.success(editingBarber ? 'Barbeiro atualizado!' : 'Barbeiro criado!');
      setDialogOpen(false);
      setEditingBarber(null);
      setForm({ name: '', photo_url: '' });
      loadBarbers();
    }
  };

  const handleEdit = (barber: Barber) => {
    setEditingBarber(barber);
    setForm({
      name: barber.name,
      photo_url: barber.photo_url || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este barbeiro?')) return;

    const { error } = await supabase
      .from('barbers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir barbeiro:', error);
      toast.error('Erro ao excluir barbeiro');
    } else {
      toast.success('Barbeiro excluído!');
      loadBarbers();
    }
  };

  const toggleActive = async (barber: Barber) => {
    const { error } = await supabase
      .from('barbers')
      .update({ is_active: !barber.is_active })
      .eq('id', barber.id);

    if (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(barber.is_active ? 'Barbeiro desativado' : 'Barbeiro ativado');
      loadBarbers();
    }
  };

  if (loading) {
    return <div>Carregando barbeiros...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Barbeiros
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingBarber(null);
                setForm({ name: '', photo_url: '' });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Barbeiro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBarber ? 'Editar Barbeiro' : 'Novo Barbeiro'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Barbeiro</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: João Silva"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="photo_url">URL da Foto (opcional)</Label>
                  <Input
                    id="photo_url"
                    type="url"
                    value={form.photo_url}
                    onChange={(e) => setForm(prev => ({ ...prev, photo_url: e.target.value }))}
                    placeholder="https://exemplo.com/foto.jpg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cole aqui o link de uma foto hospedada online
                  </p>
                </div>
                <Button type="submit" className="w-full">
                  {editingBarber ? 'Atualizar' : 'Criar'} Barbeiro
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {barbers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum barbeiro cadastrado ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {barbers.map((barber) => (
              <div key={barber.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={barber.photo_url} alt={barber.name} />
                  <AvatarFallback>
                    <Image className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{barber.name}</h3>
                    <Badge variant={barber.is_active ? 'default' : 'secondary'}>
                      {barber.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(barber)}
                  >
                    {barber.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(barber)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(barber.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
