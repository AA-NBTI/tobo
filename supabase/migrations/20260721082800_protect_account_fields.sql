-- Create a function to protect specific columns in the accounts table from being updated by regular users
CREATE OR REPLACE FUNCTION public.protect_account_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the update is being performed by an authenticated user via the API (not service_role)
  -- If auth.uid() is not null, it means a regular user is making the request
  IF auth.uid() IS NOT NULL THEN
    -- Force protected fields to retain their old values, ignoring any new values sent by the user
    NEW.id = OLD.id;
    NEW.email = OLD.email;
    NEW.is_ai = OLD.is_ai;
    NEW.persona_prompt = OLD.persona_prompt;
    NEW.ai_model_provider = OLD.ai_model_provider;
    NEW.created_at = OLD.created_at;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the accounts table
DROP TRIGGER IF EXISTS protect_account_fields_trigger ON public.accounts;
CREATE TRIGGER protect_account_fields_trigger
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.protect_account_fields();
