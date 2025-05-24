
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Scissors } from 'lucide-react';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  is_active: boolean;
}

interface ServicesManagerProps {
  barbershopId: string;
}

export const ServicesManager: React.FC<ServicesManagerProps> = ({ barbershopId }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState({
    name: '',
    price: '',
    duration: ''
  });

  useEffect(() => {
    loadServices();
  }, [barbershopId]);

  const loadServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('name');

    if (error) {
      console.error('Erro ao carregar serviços:', error);
      toast.error('Erro ao carregar serviços');
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.price || !form.duration) {
      toast.error('Preencha todos os campos');
      return;
    }

    const serviceData = {
      name: form.name,
      price: parseFloat(form.price),
      duration: parseInt(form.duration),
      barbershop_id: barbershopId,
      is_active: true
    };

    let error;
    if (editingService) {
      const { error: updateError } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', editingService.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('services')
        .insert([serviceData]);
      error = insertError;
    }

    if (error) {
      console.error('Erro ao salvar serviço:', error);
      toast.error('Erro ao salvar serviço');
    } else {
      toast.success(editingService ? 'Serviço atualizado!' : 'Serviço criado!');
      setDialogOpen(false);
      setEditingService(null);
      setForm({ name: '', price: '', duration: '' });
      loadServices();
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setForm({
      name: service.name,
      price: service.price.toString(),
      duration: service.duration.toString()
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir serviço:', error);
      toast.error('Erro ao excluir serviço');
    } else {
      toast.success('Serviço excluído!');
      loadServices();
    }
  };

  const toggleActive = async (service: Service) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);

    if (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(service.is_active ? 'Serviço desativado' : 'Serviço ativado');
      loadServices();
    }
  };

  if (loading) {
    return <div>Carregando serviços...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Serviços
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingService(null);
                setForm({ name: '', price: '', duration: '' });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Serviço
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Serviço</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Corte de Cabelo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="30.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duração (minutos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="30"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingService ? 'Atualizar' : 'Criar'} Serviço
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum serviço cadastrado ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{service.name}</h3>
                    <Badge variant={service.is_active ? 'default' : 'secondary'}>
                      {service.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    R$ {service.price.toFixed(2)} • {service.duration} min
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(service)}
                  >
                    {service.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(service)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(service.id)}
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
