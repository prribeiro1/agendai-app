
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove: () => void;
  disabled?: boolean;
  label?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onRemove,
  disabled = false,
  label = "Foto"
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);

    try {
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      console.log('Fazendo upload da imagem:', fileName);

      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from('barber-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Erro no upload:', error);
        toast.error('Erro ao fazer upload da imagem: ' + error.message);
        return;
      }

      // Obter URL pública da imagem
      const { data: { publicUrl } } = supabase.storage
        .from('barber-photos')
        .getPublicUrl(fileName);

      console.log('Upload realizado com sucesso:', publicUrl);
      onChange(publicUrl);
      toast.success('Imagem carregada com sucesso!');

    } catch (error) {
      console.error('Erro inesperado no upload:', error);
      toast.error('Erro inesperado ao fazer upload');
    } finally {
      setUploading(false);
      // Limpar o input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (value) {
      try {
        // Extrair nome do arquivo da URL
        const fileName = value.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('barber-photos')
            .remove([fileName]);
        }
      } catch (error) {
        console.error('Erro ao deletar imagem:', error);
      }
    }
    onRemove();
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {value ? (
        <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
          <img 
            src={value} 
            alt="Preview" 
            className="w-full h-full object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-1 right-1 w-6 h-6 p-0"
            onClick={handleRemove}
            disabled={disabled || uploading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors">
          <Button
            type="button"
            variant="ghost"
            className="w-full h-full flex flex-col items-center justify-center p-4"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <div className="text-center">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                <span className="text-xs text-gray-500">Carregando...</span>
              </div>
            ) : (
              <div className="text-center">
                <Camera className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-xs text-gray-500">Clique para selecionar</span>
              </div>
            )}
          </Button>
        </div>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />
      
      <p className="text-xs text-gray-500">
        Formatos aceitos: JPG, PNG, GIF (máx. 5MB)
      </p>
    </div>
  );
};
