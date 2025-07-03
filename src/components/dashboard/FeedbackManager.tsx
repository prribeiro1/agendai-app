
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Componente removido - sistema de feedback foi descontinuado
export const FeedbackManager = () => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center text-gray-500">
          Sistema de feedback foi removido.
        </div>
      </CardContent>
    </Card>
  );
};
