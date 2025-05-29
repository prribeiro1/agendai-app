import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageUpload } from '@/components/ui/image-upload';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
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
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    photo_url: ''
  });

  useEffect(() => {
    if (barbershopId) {
      loadBarbers();
    }
  }, [barbershopId]);

  const loadBarbers = async () => {
    try {
      console.log('Carregando barbeiros para barbershop_id:', barbershopId);
      
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('name');

      if (error) {
        console.error('Erro ao carregar barbeiros:', error);
        toast.error('Erro ao carregar barbeiros: ' + error.message);
      } else {
        console.log('Barbeiros carregados:', data);
        setBarbers(data || []);
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar barbeiros:', error);
      toast.error('Erro inesperado ao carregar barbeiros');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!barbershopId) {
      toast.error('ID da barbearia não encontrado');
      return;
    }

    setSubmitting(true);

    try {
      const barberData = {
        name: form.name.trim(),
        photo_url: form.photo_url.trim() || null,
        barbershop_id: barbershopId,
        is_active: true
      };

      console.log('Dados do barbeiro a serem salvos:', barberData);

      let error;
      if (editingBarber) {
        const { error: updateError } = await supabase
          .from('barbers')
          .update({
            name: barberData.name,
            photo_url: barberData.photo_url
          })
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
        toast.error('Erro ao salvar barbeiro: ' + error.message);
      } else {
        toast.success(editingBarber ? 'Barbeiro atualizado!' : 'Barbeiro criado!');
        setDialogOpen(false);
        setEditingBarber(null);
        setForm({ name: '', photo_url: '' });
        await loadBarbers();
      }
    } catch (error) {
      console.error('Erro inesperado ao salvar barbeiro:', error);
      toast.error('Erro inesperado ao salvar barbeiro');
    } finally {
      setSubmitting(false);
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

    try {
      const { error } = await supabase
        .from('barbers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir barbeiro:', error);
        toast.error('Erro ao excluir barbeiro: ' + error.message);
      } else {
        toast.success('Barbeiro excluído!');
        await loadBarbers();
      }
    } catch (error) {
      console.error('Erro inesperado ao excluir barbeiro:', error);
      toast.error('Erro inesperado ao excluir barbeiro');
    }
  };

  const toggleActive = async (barber: Barber) => {
    try {
      const { error } = await supabase
        .from('barbers')
        .update({ is_active: !barber.is_active })
        .eq('id', barber.id);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        toast.error('Erro ao atualizar status: ' + error.message);
      } else {
        toast.success(barber.is_active ? 'Barbeiro desativado' : 'Barbeiro ativado');
        await loadBarbers();
      }
    } catch (error) {
      console.error('Erro inesperado ao atualizar status:', error);
      toast.error('Erro inesperado ao atualizar status');
    }
  };

  const resetForm = () => {
    setEditingBarber(null);
    setForm({ name: '', photo_url: '' });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando barbeiros...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Barbeiros
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Barbeiro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingBarber ? 'Editar Barbeiro' : 'Novo Barbeiro'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name">Nome do Barbeiro *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: João Silva"
                    required
                    disabled={submitting}
                  />
                </div>
                
                <div>
                  <ImageUpload
                    value={form.photo_url}
                    onChange={(url) => setForm(prev => ({ ...prev, photo_url: url }))}
                    onRemove={() => setForm(prev => ({ ...prev, photo_url: '' }))}
                    disabled={submitting}
                    label="Foto do Barbeiro"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? 'Salvando...' : (editingBarber ? 'Atualizar' : 'Criar')} Barbeiro
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {barbers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhum barbeiro cadastrado</p>
            <p className="text-sm">Adicione seu primeiro barbeiro para começar a receber agendamentos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {barbers.map((barber) => (
              <div key={barber.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={barber.photo_url} alt={barber.name} />
                  <AvatarFallback>
                    {barber.name.split(' ').map(n => n[0]).join('').toUpperCase()}
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
