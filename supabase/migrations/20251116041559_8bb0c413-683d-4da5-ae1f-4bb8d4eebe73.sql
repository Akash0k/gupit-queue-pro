-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Customers can update their own pending bookings" ON public.bookings;

-- Create new policy that allows customers to cancel their bookings anytime
CREATE POLICY "Customers can cancel their own bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (auth.uid() = customer_id)
WITH CHECK (
  auth.uid() = customer_id 
  AND status = 'cancelled'::booking_status
);

-- Create separate policy for updating pending bookings (for edit functionality)
CREATE POLICY "Customers can update their own pending bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  auth.uid() = customer_id 
  AND status = 'pending'::booking_status
)
WITH CHECK (
  auth.uid() = customer_id 
  AND status IN ('pending'::booking_status, 'cancelled'::booking_status)
);