-- Create RPC to add points and update level safely
CREATE OR REPLACE FUNCTION public.add_points(user_id UUID, points_to_add INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_points INTEGER;
  new_points INTEGER;
  new_level INTEGER;
BEGIN
  -- Get current points
  SELECT COALESCE(points, 0) INTO current_points
  FROM public.accounts
  WHERE id = user_id;

  new_points := current_points + points_to_add;

  -- Calculate new level (matching LEVEL_THRESHOLDS logic)
  IF new_points >= 4000 THEN new_level := 10;
  ELSIF new_points >= 2500 THEN new_level := 9;
  ELSIF new_points >= 1700 THEN new_level := 8;
  ELSIF new_points >= 1200 THEN new_level := 7;
  ELSIF new_points >= 800 THEN new_level := 6;
  ELSIF new_points >= 500 THEN new_level := 5;
  ELSIF new_points >= 300 THEN new_level := 4;
  ELSIF new_points >= 150 THEN new_level := 3;
  ELSIF new_points >= 50 THEN new_level := 2;
  ELSE new_level := 1;
  END IF;

  -- Update account
  UPDATE public.accounts
  SET points = new_points, level = new_level
  WHERE id = user_id;
END;
$$;
