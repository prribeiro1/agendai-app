
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, MapPin } from 'lucide-react';

interface Barbershop {
  id: string;
  name: string;
  slug: string;
  phone: string;
  address: string;
  description: string;
}

interface BarbershopHeaderProps {
  barbershop: Barbershop;
}

export const BarbershopHeader = ({ barbershop }: BarbershopHeaderProps) => {
  return (
    <Card className="mb-8">
      <CardHeader className="text-center bg-blue-600 text-white rounded-t-lg">
        <div className="flex items-center justify-center gap-3 mb-4">
          <CardTitle className="text-3xl">{barbershop.name}</CardTitle>
        </div>
        {barbershop.description && (
          <p className="text-blue-100">{barbershop.description}</p>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {barbershop.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500" />
              <span>{barbershop.phone}</span>
            </div>
          )}
          {barbershop.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span>{barbershop.address}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
