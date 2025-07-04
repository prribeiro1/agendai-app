
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Save } from 'lucide-react';

interface BusinessHour {
  id?: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_open: boolean;
}

interface BusinessHoursManagerProps {
  barbershopId: string;
}

const daysOfWeek = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' }
];

export const BusinessHoursManager: React.FC<BusinessHoursManagerProps> = ({ barbershopId }) => {
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBusinessHours();
  }, [barbershopId]);

  const loadBusinessHours = async () => {
    try {
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('day_of_week');

      if (error) {
        console.error('Erro ao carregar horários:', error);
        toast.error('Erro ao carregar horários de funcionamento');
        return;
      }

      // Se não há dados, criar horários padrão
      if (!data || data.length === 0) {
        const defaultHours = daysOfWeek.map(day => ({
          day_of_week: day.value,
          open_time: day.value === 1 ? null : '08:00', // Segunda fechado por padrão
          close_time: day.value === 1 ? null : '18:00',
          is_open: day.value !== 1 // Segunda fechado por padrão
        }));
        setBusinessHours(defaultHours);
      } else {
        setBusinessHours(data);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao carregar horários');
    } finally {
      setLoading(false);
    }
  };

  const updateBusinessHour = (dayOfWeek: number, field: keyof BusinessHour, value: any) => {
    setBusinessHours(prev => 
      prev.map(hour => 
        hour.day_of_week === dayOfWeek 
          ? { ...hour, [field]: value }
          : hour
      )
    );
  };

  const toggleDay = (dayOfWeek: number, isOpen: boolean) => {
    setBusinessHours(prev => 
      prev.map(hour => 
        hour.day_of_week === dayOfWeek 
          ? { 
              ...hour, 
              is_open: isOpen,
              open_time: isOpen ? (hour.open_time || '08:00') : null,
              close_time: isOpen ? (hour.close_time || '18:00') : null
            }
          : hour
      )
    );
  };

  const saveBusinessHours = async () => {
    setSaving(true);
    try {
      // Deletar horários existentes
      const { error: deleteError } = await supabase
        .from('business_hours')
        .delete()
        .eq('barbershop_id', barbershopId);

      if (deleteError) {
        console.error('Erro ao deletar horários:', deleteError);
        toast.error('Erro ao salvar horários');
        return;
      }

      // Inserir novos horários
      const hoursToInsert = businessHours.map(hour => ({
        barbershop_id: barbershopId,
        day_of_week: hour.day_of_week,
        open_time: hour.is_open ? hour.open_time : null,
        close_time: hour.is_open ? hour.close_time : null,
        is_open: hour.is_open
      }));

      const { error: insertError } = await supabase
        .from('business_hours')
        .insert(hoursToInsert);

      if (insertError) {
        console.error('Erro ao inserir horários:', insertError);
        toast.error('Erro ao salvar horários');
        return;
      }

      toast.success('Horários de funcionamento salvos com sucesso!');
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao salvar horários');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horários de Funcionamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Carregando horários...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horários de Funcionamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {daysOfWeek.map(day => {
          const hour = businessHours.find(h => h.day_of_week === day.value) || {
            day_of_week: day.value,
            open_time: '08:00',
            close_time: '18:00',
            is_open: true
          };

          return (
            <div key={day.value} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex items-center space-x-2 min-w-[120px]">
                <Switch
                  checked={hour.is_open}
                  onCheckedChange={(checked) => toggleDay(day.value, checked)}
                />
                <Label className="font-medium">{day.label}</Label>
              </div>

              {hour.is_open ? (
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`open-${day.value}`} className="text-sm">
                      Abertura:
                    </Label>
                    <Input
                      id={`open-${day.value}`}
                      type="time"
                      value={hour.open_time || '08:00'}
                      onChange={(e) => updateBusinessHour(day.value, 'open_time', e.target.value)}
                      className="w-32"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`close-${day.value}`} className="text-sm">
                      Fechamento:
                    </Label>
                    <Input
                      id={`close-${day.value}`}
                      type="time"
                      value={hour.close_time || '18:00'}
                      onChange={(e) => updateBusinessHour(day.value, 'close_time', e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <span className="text-gray-500 text-sm">Fechado</span>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex justify-end pt-4">
          <Button onClick={saveBusinessHours} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Horários'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
