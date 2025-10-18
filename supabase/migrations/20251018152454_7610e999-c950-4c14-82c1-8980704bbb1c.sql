-- Add constraint for maximum token balance
ALTER TABLE public.profiles
ADD CONSTRAINT check_max_token_balance CHECK (token_balance <= 10000000000000000000);

-- Create function to cap token balance at maximum
CREATE OR REPLACE FUNCTION public.cap_token_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If new balance exceeds maximum, set to maximum
  IF NEW.token_balance > 1000000000000000000 THEN
    NEW.token_balance = 1000000000000000000;
  END IF;
  
  -- Ensure balance doesn't go below 0
  IF NEW.token_balance < 0 THEN
    NEW.token_balance = 0;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically cap token balance
CREATE TRIGGER cap_token_balance_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.cap_token_balance();
