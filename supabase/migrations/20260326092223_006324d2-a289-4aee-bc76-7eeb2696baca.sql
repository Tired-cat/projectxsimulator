
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('student', 'professor');

-- 2. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scenario_id TEXT NOT NULL DEFAULT 'scenario-1',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, scenario_id)
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 6. Reasoning board state table
CREATE TABLE public.reasoning_board_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  written_diagnosis TEXT,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  adjustments_made INTEGER NOT NULL DEFAULT 0,
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);
ALTER TABLE public.reasoning_board_state ENABLE ROW LEVEL SECURITY;

-- 7. Submissions table
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  final_decision TEXT NOT NULL,
  cards_on_board_count INTEGER NOT NULL DEFAULT 0,
  time_elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies for user_roles
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Professors can read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

-- 9. RLS policies for profiles
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Professors can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

-- 10. RLS policies for sessions
CREATE POLICY "Students read own sessions" ON public.sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Students insert own sessions" ON public.sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students update own sessions" ON public.sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Professors read all sessions" ON public.sessions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

-- 11. RLS policies for reasoning_board_state
CREATE POLICY "Students read own board state" ON public.reasoning_board_state
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Students insert own board state" ON public.reasoning_board_state
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students update own board state" ON public.reasoning_board_state
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Professors read all board states" ON public.reasoning_board_state
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

-- 12. RLS policies for submissions
CREATE POLICY "Students read own submissions" ON public.submissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Students insert own submissions" ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Professors read all submissions" ON public.submissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

-- 13. Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
