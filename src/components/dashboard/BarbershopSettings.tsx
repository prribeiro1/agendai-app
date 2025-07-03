
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BarbershopSettingsProps {
  barbershop: any;
  onUpdate: () => void;
}

export const BarbershopSettings: React.FC<BarbershopSettingsProps> = ({ barbershop, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: barbershop.name || '',
    phone: barbershop.phone || '',
    address: barbershop.address || '',
    description: barbershop.description || ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('O nome do estabelecimento é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          description: formData.description.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', barbershop.id);

      if (error) {
        throw error;
      }

      toast.success('Informações atualizadas com sucesso!');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar informações:', error);
      toast.error('Erro ao salvar as informações');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: barbershop.name || '',
      phone: barbershop.phone || '',
      address: barbershop.address || '',
      description: barbershop.description || ''
    });
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Informações do Estabelecimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEditing ? (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-600">Nome</Label>
              <p className="text-sm">{barbershop.name}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-600">Telefone</Label>
              <p className="text-sm">{barbershop.phone || 'Não informado'}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-600">Endereço</Label>
              <p className="text-sm">{barbershop.address || 'Não informado'}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-600">Descrição</Label>
              <p className="text-sm">{barbershop.description || 'Não informado'}</p>
            </div>
            
            <Button 
              onClick={() => setIsEditing(true)}
              variant="outline" 
              size="sm"
              className="mt-4"
            >
              <Settings className="h-4 w-4 mr-2" />
              Editar Informações
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Estabelecimento *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nome do estabelecimento"
                maxLength={100}
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(11) 99999-9999"
                maxLength={20}
              />
            </div>
            
            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Endereço completo"
                maxLength={200}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descrição do estabelecimento"
                maxLength={500}
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSave}
                disabled={loading}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
              
              <Button 
                onClick={handleCancel}
                variant="outline"
                disabled={loading}
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
