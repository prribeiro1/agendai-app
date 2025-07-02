
-- Create feedbacks table
CREATE TABLE public.feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  appointment_date DATE NOT NULL,
  service_name TEXT NOT NULL,
  barber_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Policy for barbershop owners to view feedbacks
CREATE POLICY "Owners can view their barbershop feedbacks" 
  ON public.feedbacks 
  FOR SELECT 
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));

-- Policy for anyone to insert feedbacks (clients giving feedback)
CREATE POLICY "Anyone can create feedback" 
  ON public.feedbacks 
  FOR INSERT 
  WITH CHECK (true);

-- Policy for barbershop owners to manage feedbacks
CREATE POLICY "Owners can manage their barbershop feedbacks" 
  ON public.feedbacks 
  FOR ALL 
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));
