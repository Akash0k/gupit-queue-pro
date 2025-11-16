-- Allow barbers to view all bookings in the queue (pending, confirmed, in_progress)
CREATE POLICY "Barbers can view queue bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'barber'::app_role) 
  AND status IN ('pending', 'confirmed', 'in_progress')
);